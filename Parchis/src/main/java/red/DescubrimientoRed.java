package red;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Sistema de descubrimiento 
 */
public class DescubrimientoRed {
    private static final int PUERTO_DESCUBRIMIENTO = 9999;
    private static final String MENSAJE_PING = "PARCHIS_PING";
    private static final String MENSAJE_PONG = "PARCHIS_PONG";

    private static final int TCP_CONNECT_TIMEOUT_MS = 500;
    private static final int TCP_READ_TIMEOUT_MS = 1000;
    private static final int UDP_LISTEN_TIMEOUT_MS = 500;

    private String nombreJugador;
    private int puertoP2P;
    private long timestamp;
    private ServerSocket serverDescubrimiento;
    private volatile boolean escuchando;
    private Thread hiloEscucha;
    private List<JugadorEncontrado> jugadoresEncontrados;
    private ExecutorService executor;
    private Set<String> misIPs;

    // UDP responder socket (compartible para listen durante busqueda)
    private DatagramSocket udpSocket;
    private Thread hiloUDPResponder;

    public DescubrimientoRed(String nombreJugador, int puertoP2P) {
        this.nombreJugador = nombreJugador;
        this.puertoP2P = puertoP2P;
        this.timestamp = System.currentTimeMillis();
        this.jugadoresEncontrados = new CopyOnWriteArrayList<>();
        this.escuchando = false;

        int maxThreads = Math.min(Runtime.getRuntime().availableProcessors() * 2, 80);
        this.executor = Executors.newFixedThreadPool(maxThreads);
        this.misIPs = ConcurrentHashMap.newKeySet();
    }

    /**
     *  Obtiene interfaces activas y válidas 
     */
    private List<InterfazRed> obtenerTodasLasInterfaces() {
        List<InterfazRed> interfaces = new ArrayList<>();

        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();

            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface ni = networkInterfaces.nextElement();
                try {
                    if (!ni.isUp() || ni.isLoopback() || ni.isVirtual() || ni.isPointToPoint()) continue;
                } catch (Exception e) {
                    continue;
                }

                String display = ni.getDisplayName().toLowerCase();

                // Filtrar adaptadores claramente virtuales
                if (display.contains("virtualbox") || display.contains("vmware") ||
                    display.contains("virtual") || display.contains("docker") ||
                    display.contains("hyper-v") || display.contains("vethernet")) {
                    continue;
                }

                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();

                    // Solo IPv4
                    if (!(addr instanceof Inet4Address)) continue;

                    String ip = addr.getHostAddress();
                    misIPs.add(ip);

                    String[] octetos = ip.split("\\.");
                    if (octetos.length == 4) {
                        String baseIP = octetos[0] + "." + octetos[1] + "." + octetos[2] + ".";
                        String broadcast = octetos[0] + "." + octetos[1] + "." + octetos[2] + ".255";

                        InterfazRed interfaz = new InterfazRed();
                        interfaz.nombre = ni.getDisplayName();
                        interfaz.ip = ip;
                        interfaz.baseSubnet = baseIP;
                        interfaz.broadcast = broadcast;
                        interfaces.add(interfaz);

                        System.out.println("[DESCUBRIMIENTO] Interfaz detectada: " + interfaz.nombre);
                        System.out.println("                 IP: " + ip);
                        System.out.println("                 Subnet: " + baseIP + "0-255");
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("[DESCUBRIMIENTO] Error obteniendo interfaces: " + e.getMessage());
        }

        // Si no encontro nada, intentar metodo alternativo
        if (interfaces.isEmpty()) {
            try {
                String ipLocal = InetAddress.getLocalHost().getHostAddress();
                String[] octetos = ipLocal.split("\\.");
                if (octetos.length == 4) {
                    String baseIP = octetos[0] + "." + octetos[1] + "." + octetos[2] + ".";
                    InterfazRed interfaz = new InterfazRed();
                    interfaz.nombre = "Default";
                    interfaz.ip = ipLocal;
                    interfaz.baseSubnet = baseIP;
                    interfaz.broadcast = octetos[0] + "." + octetos[1] + "." + octetos[2] + ".255";
                    interfaces.add(interfaz);
                    misIPs.add(ipLocal);

                    System.out.println("[DESCUBRIMIENTO] Fallback interfaz: " + ipLocal);
                }
            } catch (Exception e) {
                System.err.println("[DESCUBRIMIENTO] Error metodo alternativo: " + e.getMessage());
            }
        }

        return interfaces;
    }

    /**
     * Inicia modo de respuesta - servidor TCP que escucha conexiones
     * Mantiene el nombre del metodo existente.
     */
    public void iniciarModoRespuesta() {
        escuchando = true;

        // Iniciar servidor TCP ligado a 0.0.0.0 con reuseAddress
        try {
            serverDescubrimiento = new ServerSocket();
            serverDescubrimiento.setReuseAddress(true);
            serverDescubrimiento.bind(new InetSocketAddress("0.0.0.0", PUERTO_DESCUBRIMIENTO));
            serverDescubrimiento.setSoTimeout(1000);
            System.out.println("[DESCUBRIMIENTO] Servidor escuchando en puerto " + PUERTO_DESCUBRIMIENTO);
        } catch (IOException e) {
            System.err.println("[DESCUBRIMIENTO] No se pudo iniciar ServerSocket TCP: " + e.getMessage());
            // continuamos para intentar usar UDP responder
        }

        if (serverDescubrimiento != null) {
            hiloEscucha = new Thread(() -> {
                while (escuchando && !Thread.currentThread().isInterrupted()) {
                    try {
                        Socket cliente = serverDescubrimiento.accept();
                        executor.execute(() -> manejarPing(cliente));
                    } catch (SocketTimeoutException e) {
                        // normal, continuar bucle para permitir detener
                    } catch (IOException e) {
                        if (escuchando) {
                            System.err.println("[DESCUBRIMIENTO] Error en servidor: " + e.getMessage());
                        }
                    }
                }
                cerrarServidor();
            }, "Descubrimiento-TCP-Accept");
            hiloEscucha.start();
        }

        // Iniciar UDP responder en el mismo puerto (para recibir broadcasts)
        try {
            udpSocket = new DatagramSocket(null);
            udpSocket.setReuseAddress(true);
            udpSocket.bind(new InetSocketAddress(PUERTO_DESCUBRIMIENTO));
            udpSocket.setSoTimeout(UDP_LISTEN_TIMEOUT_MS);
            hiloUDPResponder = new Thread(this::runUDPResponder, "Descubrimiento-UDP-Responder");
            hiloUDPResponder.start();
            System.out.println("[DESCUBRIMIENTO] Responder UDP iniciado en puerto " + PUERTO_DESCUBRIMIENTO);
        } catch (SocketException e) {
            System.err.println("[DESCUBRIMIENTO] No se pudo iniciar UDP responder: " + e.getMessage());
        }
    }

    private void runUDPResponder() {
        byte[] buffer = new byte[1024];
        DatagramPacket paquete = new DatagramPacket(buffer, buffer.length);
        while (escuchando && udpSocket != null && !udpSocket.isClosed()) {
            try {
                udpSocket.receive(paquete);
                String recibido = new String(paquete.getData(), 0, paquete.getLength()).trim();
                if (recibido.startsWith(MENSAJE_PING)) {
                    String[] p = recibido.split(":");
                    if (p.length >= 4) {
                        String nombreRemoto = p[1];
                        if (!nombreRemoto.equals(nombreJugador)) {
                            String respuesta = MENSAJE_PONG + ":" + nombreJugador + ":" + puertoP2P + ":" + timestamp;
                            byte[] rbuf = respuesta.getBytes();
                            DatagramPacket resp = new DatagramPacket(rbuf, rbuf.length, paquete.getAddress(), paquete.getPort());
                            try {
                                udpSocket.send(resp);
                                System.out.println("[DESCUBRIMIENTO] >>> RESPONDIENDO UDP a " + paquete.getAddress().getHostAddress());
                            } catch (IOException e) {
                                // ignorar envío fallido
                            }
                        }
                    }
                }
            } catch (SocketTimeoutException e) {
                // continue para permitir detener
            } catch (IOException e) {
                if (escuchando) System.err.println("[DESCUBRIMIENTO] UDP responder error: " + e.getMessage());
            }
        }
    }

    /**
     * Maneja solicitud de ping entrante - TCP)
     */
    private void manejarPing(Socket cliente) {
        try {
            BufferedReader entrada = new BufferedReader(new InputStreamReader(cliente.getInputStream()));
            PrintWriter salida = new PrintWriter(cliente.getOutputStream(), true);

            String mensaje = entrada.readLine();

            if (mensaje != null && mensaje.startsWith(MENSAJE_PING)) {
                String[] partes = mensaje.split(":");
                if (partes.length >= 4) {
                    String nombreRemoto = partes[1];
                    //int puertoRemoto = Integer.parseInt(partes[2]);
                    //long timestampRemoto = Long.parseLong(partes[3]);

                    // No responderse a si mismo
                    if (!nombreRemoto.equals(nombreJugador)) {
                        System.out.println("[DESCUBRIMIENTO] >>> Ping TCP recibido de: " + nombreRemoto +
                                         " (desde " + cliente.getInetAddress().getHostAddress() + ")");

                        // Responder inmediatamente
                        String respuesta = MENSAJE_PONG + ":" + nombreJugador + ":" + puertoP2P + ":" + timestamp;
                        salida.println(respuesta);
                        salida.flush();

                        System.out.println("[DESCUBRIMIENTO] >>> PONG enviado a " + nombreRemoto);
                    }
                }
            }

            cliente.close();
        } catch (Exception e) {
            // Ignorar errores de conexiones individuales
        }
    }

    /**
     * Busca jugadores en TODAS las subredes detectadas
     */
    public List<JugadorEncontrado> buscarJugadores(int tiempoEspera) {
        jugadoresEncontrados.clear();

        List<InterfazRed> interfaces = obtenerTodasLasInterfaces();

        if (interfaces.isEmpty()) {
            System.err.println("[DESCUBRIMIENTO] No se detectaron interfaces de red activas");
            return new ArrayList<>();
        }

        System.out.println("\n[DESCUBRIMIENTO] ==============================================");
        System.out.println("[DESCUBRIMIENTO] ESCANEANDO " + interfaces.size() + " SUBREDES");
        System.out.println("[DESCUBRIMIENTO] Timestamp: " + timestamp);
        System.out.println("[DESCUBRIMIENTO] ==============================================\n");

        // Mostrar todas las IPs propias
        System.out.println("[DESCUBRIMIENTO] Mis IPs:");
        for (String ip : misIPs) {
            System.out.println("                 - " + ip);
        }
        System.out.println();

        // 1) Enviar broadcast UDP por cada interfaz + 255.255.255.255
        try {
            enviarBroadcastUDP(interfaces);
        } catch (Exception e) {
            // no fatal
        }

        // 2) Escuchar respuestas UDP por un tiempo limitado
        long inicio = System.currentTimeMillis();
        long esperaMillis = Math.max(1500, tiempoEspera * 1000L / 2); // parte del tiempo para UDP
        if (udpSocket != null) {
            byte[] buffer = new byte[1024];
            DatagramPacket paquete = new DatagramPacket(buffer, buffer.length);
            try {
                long deadline = System.currentTimeMillis() + esperaMillis;
                while (System.currentTimeMillis() < deadline) {
                    try {
                        udpSocket.setSoTimeout(UDP_LISTEN_TIMEOUT_MS);
                        udpSocket.receive(paquete);
                        String r = new String(paquete.getData(), 0, paquete.getLength()).trim();
                        if (r.startsWith(MENSAJE_PONG)) {
                            procesarRespuesta(r, paquete.getAddress().getHostAddress());
                        }
                    } catch (SocketTimeoutException ste) {
                        // continuar esperando hasta deadline
                    } catch (IOException ioe) {
                        break;
                    }
                }
            } catch (Exception e) {
                // ignore
            }
        }

        // 3) Si no encontramos jugadores por UDP, fallback TCP scan por subredes
        if (jugadoresEncontrados.isEmpty()) {
            System.out.println("[DESCUBRIMIENTO] No se encontraron peers por UDP, iniciando fallback TCP scan...");
            CountDownLatch latch = new CountDownLatch(interfaces.size() * 254);
            for (InterfazRed interfaz : interfaces) {
                String baseIP = interfaz.baseSubnet;
                for (int i = 1; i <= 254; i++) {
                    String ip = baseIP + i;
                    if (misIPs.contains(ip)) {
                        latch.countDown();
                        continue;
                    }
                    final String ipFinal = ip;
                    executor.execute(() -> {
                        try {
                            intentarConectar(ipFinal);
                        } finally {
                            latch.countDown();
                        }
                    });
                }
            }
            try {
                boolean completado = latch.await(tiempoEspera, TimeUnit.SECONDS);
                if (!completado) {
                    System.out.println("[DESCUBRIMIENTO] Timeout de escaneo alcanzado");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        long duracion = (System.currentTimeMillis() - inicio) / 1000;

        System.out.println("\n[DESCUBRIMIENTO] ==============================================");
        System.out.println("[DESCUBRIMIENTO] Escaneo completado en " + duracion + " segundos");
        System.out.println("[DESCUBRIMIENTO] Jugadores encontrados: " + jugadoresEncontrados.size());
        System.out.println("[DESCUBRIMIENTO] ==============================================\n");

        for (JugadorEncontrado j : jugadoresEncontrados) {
            System.out.println("  >>> " + j.nombre + " @ " + j.ip + ":" + j.puerto +
                             " (timestamp: " + j.timestamp + ")");
        }

        return new ArrayList<>(jugadoresEncontrados);
    }

    /**
     * Envia broadcast UDP por cada interfaz y a broadcast global
     */
    private void enviarBroadcastUDP(List<InterfazRed> interfaces) {
        String mensaje = MENSAJE_PING + ":" + nombreJugador + ":" + puertoP2P + ":" + timestamp;
        byte[] data = mensaje.getBytes();

        try (DatagramSocket s = new DatagramSocket()) {
            s.setBroadcast(true);

            // broadcast global (por si router lo enruta)
            try {
                DatagramPacket global = new DatagramPacket(data, data.length, InetAddress.getByName("255.255.255.255"), PUERTO_DESCUBRIMIENTO);
                s.send(global);
            } catch (Exception ex) {
                // no fatal
            }

            for (InterfazRed ir : interfaces) {
                try {
                    InetAddress bcast = InetAddress.getByName(ir.broadcast);
                    DatagramPacket p = new DatagramPacket(data, data.length, bcast, PUERTO_DESCUBRIMIENTO);
                    s.send(p);

                    // también intentar enviar directamente a la IP (algunos routers no permiten broadcast)
                    DatagramPacket p2 = new DatagramPacket(data, data.length, InetAddress.getByName(ir.ip), PUERTO_DESCUBRIMIENTO);
                    s.send(p2);

                    System.out.println("[DESCUBRIMIENTO] Enviado UDP PING a broadcast " + ir.broadcast + " (iface " + ir.nombre + ")");
                } catch (Exception e) {
                    // ignorar fallos por interfaz
                }
            }
        } catch (SocketException e) {
            System.err.println("[DESCUBRIMIENTO] Error creando socket UDP para broadcast: " + e.getMessage());
        } catch (IOException e) {
            // ignorar
        }
    }

    /**
     * Intenta conectar a una IP especifica (TCP)
     */
    private void intentarConectar(String ip) {
        Socket socket = null;
        try {
            socket = new Socket();
            socket.connect(new InetSocketAddress(ip, PUERTO_DESCUBRIMIENTO), TCP_CONNECT_TIMEOUT_MS);

            PrintWriter salida = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader entrada = new BufferedReader(new InputStreamReader(socket.getInputStream()));

            String mensaje = MENSAJE_PING + ":" + nombreJugador + ":" + puertoP2P + ":" + timestamp;
            salida.println(mensaje);
            salida.flush();

            socket.setSoTimeout(TCP_READ_TIMEOUT_MS);
            String respuesta = entrada.readLine();

            if (respuesta != null && respuesta.startsWith(MENSAJE_PONG)) {
                procesarRespuesta(respuesta, ip);
            }

        } catch (Exception e) {
            // IP no responde, normal durante escaneo
        } finally {
            try {
                if (socket != null && !socket.isClosed()) socket.close();
            } catch (IOException e) {
                // Ignorar
            }
        }
    }

    /**
     * Procesa respuesta PONG (comun UDP/TCP)
     */
    private void procesarRespuesta(String mensaje, String ip) {
        try {
            String[] partes = mensaje.split(":");
            if (partes.length >= 4) {
                String nombre = partes[1];
                int puerto = Integer.parseInt(partes[2]);
                long timestampRemoto = Long.parseLong(partes[3]);

                // No agregarse a si mismo
                if (nombre.equals(nombreJugador)) {
                    return;
                }

                // Verificar duplicados
                synchronized (jugadoresEncontrados) {
                    for (JugadorEncontrado j : jugadoresEncontrados) {
                        if (j.nombre.equals(nombre)) {
                            return;
                        }
                    }

                    JugadorEncontrado jugador = new JugadorEncontrado(nombre, ip, puerto, timestampRemoto);
                    jugadoresEncontrados.add(jugador);

                    System.out.println("\n[DESCUBRIMIENTO] *** JUGADOR ENCONTRADO ***");
                    System.out.println("                 Nombre: " + nombre);
                    System.out.println("                 IP: " + ip);
                    System.out.println("                 Puerto P2P: " + puerto);
                    System.out.println("                 Timestamp: " + timestampRemoto);
                    System.out.println();
                }
            }
        } catch (Exception e) {
            System.err.println("[DESCUBRIMIENTO] Error procesando respuesta: " + e.getMessage());
        }
    }

    /**
     * Detiene el modo de respuesta
     */
    public void detenerModoRespuesta() {
        escuchando = false;

        if (hiloEscucha != null) {
            hiloEscucha.interrupt();
            try {
                hiloEscucha.join(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        if (hiloUDPResponder != null) {
            hiloUDPResponder.interrupt();
        }

        if (udpSocket != null && !udpSocket.isClosed()) {
            udpSocket.close();
        }

        cerrarServidor();
        executor.shutdownNow();

        System.out.println("[DESCUBRIMIENTO] Modo respuesta detenido");
    }

    /**
     * Cierra el servidor de descubrimiento
     */
    private void cerrarServidor() {
        if (serverDescubrimiento != null && !serverDescubrimiento.isClosed()) {
            try {
                serverDescubrimiento.close();
            } catch (IOException e) {
                // Ignorar
            }
        }
    }

    /**
     * Obtiene el timestamp de este jugador
     */
    public long getTimestamp() {
        return timestamp;
    }

    /**
     * Clase interna para representar una interfaz de red
     */
    private static class InterfazRed {
        String nombre;
        String ip;
        String baseSubnet;
        String broadcast;
    }

    /**
     * Clase interna para jugador encontrado
     */
    public static class JugadorEncontrado {
        public String nombre;
        public String ip;
        public int puerto;
        public long timestamp;

        public JugadorEncontrado(String nombre, String ip, int puerto, long timestamp) {
            this.nombre = nombre;
            this.ip = ip;
            this.puerto = puerto;
            this.timestamp = timestamp;
        }

        @Override
        public String toString() {
            return nombre + " @ " + ip + ":" + puerto + " (ts:" + timestamp + ")";
        }
    }
}