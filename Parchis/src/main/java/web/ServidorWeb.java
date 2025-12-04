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
 * Servidor WebSocket CORREGIDO para Parchís
 * Maneja correctamente TIRAR_DADO y otras acciones
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
        
        broadcast(adaptador.obtenerEstadoLobby());
    }
    
    @Override
    public void onMessage(WebSocket conn, String message) {
        String sessionId = sesiones.get(conn);
        System.out.println("[MENSAJE] De " + sessionId + ": " + message);
        
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String accion = json.get("accion").getAsString();
            
            // Log más detallado
            System.out.println("[SERVIDOR] Procesando acción: '" + accion + "'");
            
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
     * Procesa las diferentes acciones del cliente - CORREGIDO
     */
    private String procesarAccion(String sessionId, String accion, JsonObject json, WebSocket conn) {
        System.out.println("[SERVIDOR] Procesando acción: " + accion);
        
        // Normalizar acción (por si viene en diferentes formatos)
        String accionNormalizada = accion.toUpperCase().replace("_", "");
        
        switch (accionNormalizada) {
            // === ACCIONES DE SALA ===
            case "CREARSALA": {
                String nombre = json.has("nombre") ? json.get("nombre").getAsString() : "Jugador";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                System.out.println("[SERVIDOR] Creando sala para: " + nombre);
                return adaptador.crearSala(sessionId, nombre, avatar);
            }
            
            case "UNIRSESALA": 
            case "UNIRSEASALA": {
                String nombre = json.has("nombre") ? json.get("nombre").getAsString() : "Jugador";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                System.out.println("[SERVIDOR] Uniéndose a sala: " + nombre);
                return adaptador.unirseSala(sessionId, nombre, avatar);
            }
            
            case "REGISTRARJUGADOR": {
                String nombre = json.get("nombre").getAsString();
                String color = json.has("color") ? json.get("color").getAsString() : "";
                String avatar = json.has("avatar") ? json.get("avatar").getAsString() : "personaje0";
                return adaptador.registrarJugador(sessionId, nombre, color, avatar);
            }
            
            case "SALIRSALA": {
                adaptador.eliminarJugador(sessionId);
                return null;
            }
            
            case "OBTENERESTADOLOBBY":
                return adaptador.obtenerEstadoLobby();
            
            // === ACCIONES DE PARTIDA ===
            case "INICIARPARTIDA":
            case "SOLICITARINICIO":
                System.out.println("[SERVIDOR] Iniciando partida...");
                return adaptador.intentarIniciarPartida();
            
            case "TIRARDADO": {
                System.out.println("[SERVIDOR] *** TIRAR DADO RECIBIDO ***");
                System.out.println("[SERVIDOR] SessionId: " + sessionId);
                String resultado = adaptador.tirarDado(sessionId);
                System.out.println("[SERVIDOR] Resultado tirada: " + resultado);
                return resultado;
            }
            
            case "MOVERFICHA": {
                int fichaId = json.get("fichaId").getAsInt();
                int pasos = json.get("pasos").getAsInt();
                System.out.println("[SERVIDOR] Moviendo ficha: " + fichaId + " con " + pasos + " pasos");
                return adaptador.moverFicha(sessionId, fichaId, pasos);
            }
            
            case "CAMBIARTURNO":
            case "PASARTURNO":
                System.out.println("[SERVIDOR] Cambiando turno...");
                return adaptador.cambiarTurno();
            
            case "OBTENERESTADOJUEGO":
                return adaptador.obtenerEstadoJuego();
            
            default:
                System.out.println("[SERVIDOR] ⚠️ Acción desconocida: " + accion);
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
        String accionNormalizada = accion.toUpperCase().replace("_", "");
        
        switch (accionNormalizada) {
            case "CREARSALA":
            case "UNIRSESALA":
            case "UNIRSEASALA":
            case "REGISTRARJUGADOR":
                conn.send(respuesta);
                broadcast(adaptador.obtenerEstadoLobby());
                break;
                
            case "INICIARPARTIDA":
            case "SOLICITARINICIO":
                System.out.println("[SERVIDOR] Broadcasting inicio de partida");
                broadcast(respuesta);
                break;
                
            case "TIRARDADO":
                System.out.println("[SERVIDOR] Broadcasting resultado del dado");
                broadcast(respuesta);
                break;
                
            case "MOVERFICHA":
                System.out.println("[SERVIDOR] Broadcasting movimiento de ficha");
                broadcast(respuesta);
                broadcast(adaptador.obtenerEstadoJuego());
                break;
                
            case "CAMBIARTURNO":
            case "PASARTURNO":
                broadcast(respuesta);
                break;
                
            case "OBTENERESTADOLOBBY":
            case "OBTENERESTADOJUEGO":
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