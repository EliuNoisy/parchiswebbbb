package web;

import modelo.Partida;
import modelo.Jugador;
import modelo.Ficha;
import com.google.gson.Gson;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

/**
 * Adaptador mejorado con lógica completa de Parchís
 * Sincronizado con el frontend JavaScript
 */
public class AdaptadorJuego {
    
    private Partida partida;
    private Map<String, Integer> jugadorSesion;
    private Map<String, String> avatarJugador; // sessionId -> avatar
    private int contadorJugadores;
    private Gson gson;
    
    // Configuración del tablero - SINCRONIZADO CON FRONTEND
    private static final int[] CASILLAS_SALIDA = {0, 17, 34, 51}; // ROJO, VERDE, AZUL, AMARILLO
    private static final int TOTAL_CASILLAS = 68;
    private static final int CASILLAS_PASILLO = 7; // 6 casillas + meta
    
    public AdaptadorJuego() {
        this.partida = new Partida(1);
        this.jugadorSesion = new HashMap<>();
        this.avatarJugador = new HashMap<>();
        this.contadorJugadores = 0;
        this.gson = new Gson();
    }
    
    /**
     * Crea una nueva sala (llamado cuando el cliente envía CREAR_SALA)
     */
    public String crearSala(String sessionId, String nombre, String avatar) {
        return registrarJugador(sessionId, nombre, "", avatar);
    }
    
    /**
     * Une a una sala existente (llamado cuando el cliente envía UNIRSE_SALA)
     */
    public String unirseSala(String sessionId, String nombre, String avatar) {
        return registrarJugador(sessionId, nombre, "", avatar);
    }
    
    /**
     * Registra un nuevo jugador con asignación automática de color
     */
    public String registrarJugador(String sessionId, String nombre, String colorCliente, String avatar) {
        try {
            // Verificar si ya está registrado
            if (jugadorSesion.containsKey(sessionId)) {
                int id = jugadorSesion.get(sessionId);
                Jugador existente = buscarJugadorPorId(id);
                if (existente != null) {
                    Map<String, Object> resp = new HashMap<>();
                    resp.put("tipo", "REGISTRO_EXITOSO");
                    resp.put("jugador", existente.getNombre());
                    resp.put("color", existente.getColor());
                    resp.put("idJugador", existente.getIdJugador());
                    return gson.toJson(resp);
                }
            }

            if (partida.getJugadores().size() >= 4) {
                return crearError("Partida llena. Máximo 4 jugadores.");
            }

            // Asignar color disponible
            String[] colores = {"ROJO", "AZUL", "VERDE", "AMARILLO"};
            String colorAsignado = null;

            for (String c : colores) {
                if (partida.buscarJugadorPorColor(c) == null) {
                    colorAsignado = c;
                    break;
                }
            }
            
            if (colorAsignado == null) {
                return crearError("No hay colores disponibles.");
            }

            contadorJugadores++;
            Jugador jugador = new Jugador(contadorJugadores, nombre, colorAsignado);
            
            // Guardar avatar
            if (avatar != null && !avatar.isEmpty()) {
                jugador.setAvatar(avatar);
                avatarJugador.put(sessionId, avatar);
            }
            
            partida.agregarJugador(jugador);
            jugadorSesion.put(sessionId, jugador.getIdJugador());

            System.out.println("[ADAPTADOR] Jugador registrado: " + nombre + " -> " + colorAsignado);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("tipo", "REGISTRO_EXITOSO");
            respuesta.put("jugador", nombre);
            respuesta.put("color", colorAsignado);
            respuesta.put("idJugador", jugador.getIdJugador());

            return gson.toJson(respuesta);

        } catch (Exception e) {
            e.printStackTrace();
            return crearError("Error al registrar jugador: " + e.getMessage());
        }
    }
    
    /**
     * Registra jugador (versión sin avatar para compatibilidad)
     */
    public String registrarJugador(String sessionId, String nombre, String colorCliente) {
        return registrarJugador(sessionId, nombre, colorCliente, "personaje0");
    }
    
    /**
     * Obtiene el estado del lobby con información de avatares
     */
    public String obtenerEstadoLobby() {
        List<Map<String, Object>> listaJugadores = new ArrayList<>();
        
        for (Jugador j : partida.getJugadores()) {
            Map<String, Object> jugadorData = new HashMap<>();
            jugadorData.put("nombre", j.getNombre());
            jugadorData.put("color", j.getColor());
            jugadorData.put("idJugador", j.getIdJugador());
            jugadorData.put("avatar", j.getAvatar() != null ? j.getAvatar() : "personaje0");
            listaJugadores.add(jugadorData);
        }
        
        Map<String, Object> estado = new HashMap<>();
        estado.put("tipo", "ACTUALIZAR_LOBBY");
        estado.put("jugadores", listaJugadores);
        estado.put("numJugadores", partida.getJugadores().size());
        estado.put("puedeIniciar", partida.getJugadores().size() >= 2);
        
        return gson.toJson(estado);
    }
    
    /**
     * Inicia la partida
     */
    public String intentarIniciarPartida() {
        if (partida.getJugadores().size() < 2) {
            return crearError("Se necesitan al menos 2 jugadores para iniciar");
        }
        
        partida.iniciarPartida();
        
        List<Map<String, Object>> jugadoresData = new ArrayList<>();
        for (Jugador j : partida.getJugadores()) {
            Map<String, Object> jData = new HashMap<>();
            jData.put("nombre", j.getNombre());
            jData.put("color", j.getColor());
            jData.put("avatar", j.getAvatar() != null ? j.getAvatar() : "personaje0");
            jugadoresData.add(jData);
        }
        
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("tipo", "PARTIDA_INICIADA");
        respuesta.put("turnoActual", partida.getTurnoActual().getColor());
        respuesta.put("jugadores", jugadoresData);
        
        System.out.println("[ADAPTADOR] Partida iniciada. Turno: " + partida.getTurnoActual().getColor());
        
        return gson.toJson(respuesta);
    }
    
    /**
     * Procesa tirada de dado con validación de turno
     */
     public String tirarDado(String sessionId) {
        System.out.println("\n========================================");
        System.out.println("[ADAPTADOR] TIRAR DADO - INICIO");
        System.out.println("========================================");
        
        Integer idJugador = jugadorSesion.get(sessionId);
        System.out.println("[ADAPTADOR] SessionId: " + sessionId);
        System.out.println("[ADAPTADOR] IdJugador obtenido: " + idJugador);
        
        if (idJugador == null) {
            System.out.println("[ADAPTADOR] ERROR: Jugador no registrado");
            System.out.println("[ADAPTADOR] Sesiones registradas: " + jugadorSesion.keySet());
            return crearError("Jugador no registrado");
        }
        
        Jugador jugador = buscarJugadorPorId(idJugador);
        System.out.println("[ADAPTADOR] Jugador encontrado: " + (jugador != null ? jugador.getNombre() : "NULL"));
        
        if (jugador == null) {
            System.out.println("[ADAPTADOR] ERROR: Jugador no encontrado en partida");
            return crearError("Jugador no encontrado");
        }
        
        if (partida.getTurnoActual() == null) {
            System.out.println("[ADAPTADOR] ERROR: La partida no ha iniciado");
            return crearError("La partida no ha iniciado");
        }
        
        System.out.println("[ADAPTADOR] Turno actual: " + partida.getTurnoActual().getColor());
        System.out.println("[ADAPTADOR] Color del jugador: " + jugador.getColor());
        
        if (partida.getTurnoActual().getIdJugador() != jugador.getIdJugador()) {
            String mensaje = "No es tu turno. Turno actual: " + partida.getTurnoActual().getColor();
            System.out.println("[ADAPTADOR] ERROR: " + mensaje);
            return crearError(mensaje);
        }
        
        System.out.println("[ADAPTADOR] ✓ Validación pasada, lanzando dado...");
        int valorDado = partida.getDado().lanzar();
        System.out.println("[ADAPTADOR] *** DADO LANZADO: " + valorDado + " ***");
        
        if (valorDado == 6) {
            partida.incrementarContadorSeis();
            System.out.println("[ADAPTADOR] Contador de 6: " + partida.getContadorSeis());
        } else {
            partida.reiniciarContadorSeis();
        }
        
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("tipo", "DADO_TIRADO");
        respuesta.put("jugador", jugador.getNombre());
        respuesta.put("color", jugador.getColor());
        respuesta.put("valor", valorDado);
        respuesta.put("contadorSeis", partida.getContadorSeis());
        
        String jsonRespuesta = gson.toJson(respuesta);
        System.out.println("[ADAPTADOR] Respuesta JSON: " + jsonRespuesta);
        System.out.println("========================================\n");
        
        return jsonRespuesta;
    }
    
    /**
     * Mueve una ficha aplicando las reglas del Parchís
     * @param fichaNumero Número de ficha (1-4) NO el idFicha global
     */
    public String moverFicha(String sessionId, int fichaNumero, int pasos) {
        Integer idJugador = jugadorSesion.get(sessionId);
        
        if (idJugador == null) {
            return crearError("Jugador no registrado");
        }
        
        Jugador jugador = buscarJugadorPorId(idJugador);
        
        if (jugador == null) {
            return crearError("Jugador no encontrado");
        }
        
        if (partida.getTurnoActual().getIdJugador() != jugador.getIdJugador()) {
            return crearError("No es tu turno");
        }
        
        // IMPORTANTE: fichaNumero es 1-4, convertir a índice 0-3
        Ficha ficha = jugador.seleccionarFicha(fichaNumero - 1);
        
        if (ficha == null) {
            return crearError("Ficha no válida. Número: " + fichaNumero);
        }
        
        System.out.println("[ADAPTADOR] Moviendo ficha " + fichaNumero + " del jugador " + jugador.getColor() + " - " + pasos + " pasos");
        
        boolean movimientoValido = false;
        boolean fichaCumida = false;
        boolean llegadaMeta = false;
        boolean salioDeCasa = false;
        int premioCasillas = 0;
        
        // Lógica de movimiento
        if (pasos == 5 && ficha.isEnCasa()) {
            // Sacar ficha de casa
            int casillaInicio = obtenerCasillaInicio(jugador.getColor());
            ficha.setPosicion(casillaInicio);
            ficha.setEnCasa(false);
            partida.getTablero().getCasilla(casillaInicio).agregarFicha(ficha);
            movimientoValido = true;
            salioDeCasa = true;
            
            System.out.println("[ADAPTADOR] Ficha salió de casa a casilla " + casillaInicio);
            
        } else if (!ficha.isEnCasa() && !ficha.isEnMeta()) {
            // Mover ficha en el tablero
            int posicionActual = ficha.getPosicion();
            int nuevaPosicion = calcularNuevaPosicion(jugador.getColor(), posicionActual, pasos);
            
            System.out.println("[ADAPTADOR] Posición actual: " + posicionActual + " -> Nueva posición: " + nuevaPosicion);
            
            if (nuevaPosicion >= 0) {
                // Remover de casilla actual si está en el tablero principal
                if (posicionActual >= 0 && posicionActual < TOTAL_CASILLAS) {
                    partida.getTablero().getCasilla(posicionActual).removerFicha(ficha);
                }
                
                // Verificar si entra al pasillo o llega a meta
                if (nuevaPosicion >= 100) {
                    // Está en el pasillo de meta (usamos 100+ para indicar pasillo)
                    int posicionPasillo = nuevaPosicion - 100;
                    
                    if (posicionPasillo >= CASILLAS_PASILLO - 1) {
                        // Llegó a la meta
                        ficha.llegarMeta();
                        llegadaMeta = true;
                        premioCasillas = 10;
                        System.out.println("[ADAPTADOR] ¡Ficha llegó a META!");
                    } else {
                        ficha.setPosicion(nuevaPosicion);
                    }
                } else {
                    // Movimiento normal en el tablero
                    ficha.setPosicion(nuevaPosicion);
                    
                    // Agregar a nueva casilla
                    if (nuevaPosicion < TOTAL_CASILLAS) {
                        partida.getTablero().getCasilla(nuevaPosicion).agregarFicha(ficha);
                        
                        // Verificar si come fichas
                        if (!partida.getTablero().getCasilla(nuevaPosicion).esSegura()) {
                            List<Ficha> fichasEnCasilla = new ArrayList<>(
                                partida.getTablero().getCasilla(nuevaPosicion).getFichas()
                            );
                            
                            for (Ficha otraFicha : fichasEnCasilla) {
                                if (!otraFicha.equals(ficha) && !otraFicha.getColor().equals(ficha.getColor())) {
                                    otraFicha.regresarACasa();
                                    partida.getTablero().getCasilla(nuevaPosicion).removerFicha(otraFicha);
                                    fichaCumida = true;
                                    premioCasillas = 20;
                                    System.out.println("[ADAPTADOR] ¡Ficha comida! Color: " + otraFicha.getColor());
                                }
                            }
                        }
                    }
                }
                
                movimientoValido = true;
            }
        }
        
        if (!movimientoValido) {
            return crearError("Movimiento no válido para ficha " + fichaNumero);
        }
        
        // Crear respuesta
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("tipo", "FICHA_MOVIDA");
        respuesta.put("jugador", jugador.getNombre());
        respuesta.put("color", jugador.getColor());
        respuesta.put("fichaNumero", fichaNumero);
        respuesta.put("fichaCumida", fichaCumida);
        respuesta.put("llegadaMeta", llegadaMeta);
        respuesta.put("salioDeCasa", salioDeCasa);
        respuesta.put("premioCasillas", premioCasillas);
        
        // Estado de la ficha para el frontend
        Map<String, Object> fichaEstado = new HashMap<>();
        fichaEstado.put("color", ficha.getColor());
        fichaEstado.put("numero", fichaNumero);
        fichaEstado.put("posicion", ficha.getPosicion());
        fichaEstado.put("enCasa", ficha.isEnCasa());
        fichaEstado.put("enMeta", ficha.isEnMeta());
        
        // Determinar si está en pasillo
        boolean enPasillo = ficha.getPosicion() >= 100;
        fichaEstado.put("enPasillo", enPasillo);
        fichaEstado.put("posicionPasillo", enPasillo ? ficha.getPosicion() - 100 : -1);
        
        respuesta.put("fichaEstado", fichaEstado);
        
        // Verificar si hay ganador
        String resultadoGanador = verificarGanador();
        if (resultadoGanador != null) {
            return resultadoGanador;
        }
        
        return gson.toJson(respuesta);
    }
    
    /**
     * Calcula la nueva posición considerando el circuito y entrada a pasillo
     */
    private int calcularNuevaPosicion(String color, int posicionActual, int pasos) {
        int casillaEntradaPasillo = obtenerCasillaEntradaPasillo(color);
        
        // Si ya está en el pasillo (posición >= 100)
        if (posicionActual >= 100) {
            int posicionEnPasillo = posicionActual - 100;
            int nuevaPosicionPasillo = posicionEnPasillo + pasos;
            
            if (nuevaPosicionPasillo >= CASILLAS_PASILLO) {
                return -1; // No puede avanzar, se pasa de la meta
            }
            return 100 + nuevaPosicionPasillo;
        }
        
        // Calcular distancia hasta entrada al pasillo
        int distanciaHastaEntrada;
        if (posicionActual <= casillaEntradaPasillo) {
            distanciaHastaEntrada = casillaEntradaPasillo - posicionActual;
        } else {
            distanciaHastaEntrada = (TOTAL_CASILLAS - posicionActual) + casillaEntradaPasillo;
        }
        
        // Si los pasos lo llevan más allá de la entrada al pasillo
        if (pasos > distanciaHastaEntrada && distanciaHastaEntrada >= 0) {
            int pasosEnPasillo = pasos - distanciaHastaEntrada - 1;
            if (pasosEnPasillo >= CASILLAS_PASILLO) {
                return -1; // Se pasa de la meta
            }
            return 100 + pasosEnPasillo; // Entra al pasillo
        }
        
        // Movimiento normal en el tablero
        int nuevaPosicion = (posicionActual + pasos) % TOTAL_CASILLAS;
        return nuevaPosicion;
    }
    
    /**
     * Obtiene la casilla de inicio (salida) según el color
     */
    private int obtenerCasillaInicio(String color) {
        switch (color) {
            case "ROJO": return 0;
            case "VERDE": return 17;
            case "AZUL": return 34;
            case "AMARILLO": return 51;
            default: return 0;
        }
    }
    
    /**
     * Obtiene la casilla donde el jugador entra a su pasillo de meta
     */
    private int obtenerCasillaEntradaPasillo(String color) {
        switch (color) {
            case "ROJO": return 67;    // Antes de casilla 0, entra al pasillo
            case "VERDE": return 16;   // Antes de casilla 17
            case "AZUL": return 33;    // Antes de casilla 34
            case "AMARILLO": return 50; // Antes de casilla 51
            default: return 67;
        }
    }
    
    /**
     * Cambia al siguiente turno
     */
    public String cambiarTurno() {
        partida.cambiarTurno();
        partida.reiniciarContadorSeis();
        
        System.out.println("[ADAPTADOR] Turno cambiado a: " + partida.getTurnoActual().getColor());
        
        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("tipo", "TURNO_CAMBIADO");
        respuesta.put("turnoActual", partida.getTurnoActual().getColor());
        
        return gson.toJson(respuesta);
    }
    
    /**
     * Obtiene el estado completo del juego
     */
    public String obtenerEstadoJuego() {
        List<Map<String, Object>> fichasData = new ArrayList<>();
        
        for (Jugador jugador : partida.getJugadores()) {
            int numeroFicha = 1;
            for (Ficha ficha : jugador.getFichas()) {
                Map<String, Object> fichaInfo = new HashMap<>();
                fichaInfo.put("color", jugador.getColor());
                fichaInfo.put("numeroFicha", numeroFicha);
                fichaInfo.put("numero", numeroFicha);
                fichaInfo.put("posicion", ficha.getPosicion());
                fichaInfo.put("enCasa", ficha.isEnCasa());
                fichaInfo.put("enMeta", ficha.isEnMeta());
                
                boolean enPasillo = ficha.getPosicion() >= 100;
                fichaInfo.put("enPasillo", enPasillo);
                fichaInfo.put("posicionPasillo", enPasillo ? ficha.getPosicion() - 100 : -1);
                
                fichasData.add(fichaInfo);
                numeroFicha++;
            }
        }
        
        Map<String, Object> estado = new HashMap<>();
        estado.put("tipo", "ESTADO_JUEGO");
        estado.put("turnoActual", partida.getTurnoActual() != null ? partida.getTurnoActual().getColor() : null);
        estado.put("fichas", fichasData);
        
        return gson.toJson(estado);
    }
    
    /**
     * Verifica si hay un ganador
     */
    public String verificarGanador() {
        for (Jugador jugador : partida.getJugadores()) {
            int fichasEnMeta = 0;
            for (Ficha ficha : jugador.getFichas()) {
                if (ficha.isEnMeta()) {
                    fichasEnMeta++;
                }
            }
            
            if (fichasEnMeta == 4) {
                partida.finalizarPartida();
                
                System.out.println("[ADAPTADOR] ¡GANADOR! " + jugador.getNombre());
                
                Map<String, Object> respuesta = new HashMap<>();
                respuesta.put("tipo", "PARTIDA_TERMINADA");
                respuesta.put("ganador", jugador.getNombre());
                respuesta.put("color", jugador.getColor());
                
                return gson.toJson(respuesta);
            }
        }
        
        return null;
    }
    
    /**
     * Elimina un jugador de la partida
     */
    public void eliminarJugador(String sessionId) {
        Integer idJugador = jugadorSesion.get(sessionId);
        if (idJugador != null) {
            jugadorSesion.remove(sessionId);
            avatarJugador.remove(sessionId);
            System.out.println("[ADAPTADOR] Jugador " + idJugador + " eliminado de la sesión");
        }
    }
    
    /**
     * Obtiene el color de un jugador por su sessionId
     */
    public String obtenerColorJugador(String sessionId) {
        Integer idJugador = jugadorSesion.get(sessionId);
        if (idJugador != null) {
            Jugador jugador = buscarJugadorPorId(idJugador);
            if (jugador != null) {
                return jugador.getColor();
            }
        }
        return null;
    }
    
    private Jugador buscarJugadorPorId(int idJugador) {
        for (Jugador j : partida.getJugadores()) {
            if (j.getIdJugador() == idJugador) {
                return j;
            }
        }
        return null;
    }
    
    private String crearError(String mensaje) {
        System.out.println("[ADAPTADOR] ERROR: " + mensaje);
        Map<String, Object> error = new HashMap<>();
        error.put("tipo", "ERROR");
        error.put("mensaje", mensaje);
        return gson.toJson(error);
    }
    
    public Partida getPartida() {
        return partida;
    }
    
    public int getNumeroJugadores() {
        return partida.getJugadores().size();
    }
    
    /**
     * Reinicia la partida para una nueva
     */
    public void reiniciarPartida() {
        this.partida = new Partida(1);
        this.jugadorSesion.clear();
        this.avatarJugador.clear();
        this.contadorJugadores = 0;
        System.out.println("[ADAPTADOR] Partida reiniciada");
    }
}

