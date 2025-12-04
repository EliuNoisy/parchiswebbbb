package web;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Map;

/**
 * Servidor WebSocket mejorado para Parchís
 * Compatible con el frontend JavaScript
 */
public class ServidorWeb extends WebSocketServer {
    
    private AdaptadorJuego adaptador;
    private Gson gson;
    private Map<WebSocket, String> sesiones;
    
    public ServidorWeb(int puerto) {
        super(new InetSocketAddress(puerto));
        this.adaptador = new AdaptadorJuego();
        this.gson = new Gson();
        this.sesiones = new HashMap<>();
        System.out.println("[SERVIDOR] Inicializando en puerto " + puerto);
    }
    
    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String sessionId = generarSessionId();
        sesiones.put(conn, sessionId);
        
        System.out.println("[CONEXIÓN] Nueva conexión: " + sessionId);
        
        Map<String, String> respuesta = new HashMap<>();
        respuesta.put("tipo", "CONEXION_EXITOSA");
        respuesta.put("sessionId", sessionId);
        conn.send(gson.toJson(respuesta));
    }
    
    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String sessionId = sesiones.get(conn);
        System.out.println("[DESCONEXIÓN] " + sessionId + " - Razón: " + reason);
        
        if (sessionId != null) {
            adaptador.eliminarJugador(sessionId);
            sesiones.remove(conn);
        }
        
        // Notificar a todos los clientes del cambio en el lobby
        broadcast(adaptador.obtenerEstadoLobby());
    }
    
    @Override
    public void onMessage(WebSocket conn, String message) {
        String sessionId = sesiones.get(conn);
        System.out.println("[MENSAJE] De " + sessionId + ": " + message);
        
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String accion = json.get("accion").getAsString();
            
            String respuesta = procesarAccion(sessionId, accion, json, conn);
            
            if (respuesta != null) {
                manejarRespuesta(conn, accion, respuesta);
            }
            
        } catch (Exception e) {
            System.err.println("[ERROR] Procesando mensaje: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, String> error = new HashMap<>();
            error.put("tipo", "ERROR");
            error.put("mensaje", "Error procesando solicitud: " + e.getMessage());
            conn.send(gson.toJson(error));
        }
    }
    
    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("[ERROR] En conexión: " + ex.getMessage());
        ex.printStackTrace();
    }
    
    @Override
    public void onStart() {
        System.out.println("[SERVIDOR] ✅ WebSocket iniciado correctamente");
        setConnectionLostTimeout(0);
        setConnectionLostTimeout(100);
    }
    
    /**
     * Procesa las diferentes acciones del cliente
     */
    private String procesarAccion(String sessionId, String accion, JsonObject json, WebSocket conn) {
        System.out.println("[SERVIDOR] Procesando acción: " + accion);
        
        switch (accion) {
            // === ACCIONES DE SALA ===
            case "CREAR_SALA": {
                String nombre = json.has("nombre") ? json.get("nombre").getAsString() : "Jugador";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                return adaptador.crearSala(sessionId, nombre, avatar);
            }
            
            case "UNIRSE_SALA": {
                String nombre = json.has("nombre") ? json.get("nombre").getAsString() : "Jugador";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                return adaptador.unirseSala(sessionId, nombre, avatar);
            }
            
            case "REGISTRAR_JUGADOR": {
                String nombre = json.get("nombre").getAsString();
                String color = json.has("color") ? json.get("color").getAsString() : "";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                return adaptador.registrarJugador(sessionId, nombre, color, avatar);
            }
            
            case "SALIR_SALA": {
                adaptador.eliminarJugador(sessionId);
                return null; // El broadcast del lobby se hace en onClose
            }
            
            case "OBTENER_ESTADO_LOBBY":
                return adaptador.obtenerEstadoLobby();
            
            // === ACCIONES DE PARTIDA ===
            case "INICIAR_PARTIDA":
            case "SOLICITAR_INICIO":
                return adaptador.intentarIniciarPartida();
            
            case "TIRAR_DADO":
                return adaptador.tirarDado(sessionId);
            
            case "MOVER_FICHA": {
                int fichaId = json.get("fichaId").getAsInt();
                int pasos = json.get("pasos").getAsInt();
                return adaptador.moverFicha(sessionId, fichaId, pasos);
            }
            
            case "CAMBIAR_TURNO":
            case "PASAR_TURNO":
                return adaptador.cambiarTurno();
            
            case "OBTENER_ESTADO_JUEGO":
                return adaptador.obtenerEstadoJuego();
            
            default:
                System.out.println("[SERVIDOR] Acción desconocida: " + accion);
                Map<String, String> error = new HashMap<>();
                error.put("tipo", "ERROR");
                error.put("mensaje", "Acción desconocida: " + accion);
                return gson.toJson(error);
        }
    }
    
    /**
     * Maneja cómo se envía la respuesta (individual o broadcast)
     */
    private void manejarRespuesta(WebSocket conn, String accion, String respuesta) {
        switch (accion) {
            // Acciones que requieren broadcast a todos
            case "CREAR_SALA":
            case "UNIRSE_SALA":
            case "REGISTRAR_JUGADOR":
                conn.send(respuesta);
                broadcast(adaptador.obtenerEstadoLobby());
                break;
                
            case "INICIAR_PARTIDA":
            case "SOLICITAR_INICIO":
                broadcast(respuesta);
                break;
                
            case "TIRAR_DADO":
                broadcast(respuesta);
                break;
                
            case "MOVER_FICHA":
                broadcast(respuesta);
                // También enviar estado actualizado del juego
                broadcast(adaptador.obtenerEstadoJuego());
                break;
                
            case "CAMBIAR_TURNO":
            case "PASAR_TURNO":
                broadcast(respuesta);
                break;
                
            // Acciones que solo responden al cliente que las solicitó
            case "OBTENER_ESTADO_LOBBY":
            case "OBTENER_ESTADO_JUEGO":
                conn.send(respuesta);
                break;
                
            default:
                conn.send(respuesta);
                break;
        }
    }
    
    /**
     * Genera un ID único para la sesión
     */
    private String generarSessionId() {
        return "session_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 10000);
    }
    
    /**
     * Obtiene el número de clientes conectados
     */
    public int getNumeroConectados() {
        return sesiones.size();
    }
}