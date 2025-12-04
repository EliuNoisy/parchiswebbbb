package web;

/**
 * Clase principal que inicia el servidor WebSocket
 */
public class ParchisWeb {
    
    public static void main(String[] args) {
        System.out.println("===========================================");
        System.out.println("    SERVIDOR PARCHÍS WEB");
        System.out.println("===========================================");
        
        // Puerto para WebSocket
        int puertoWS = 8085;
        
        try {
            // Iniciar servidor WebSocket
            ServidorWeb servidor = new ServidorWeb(puertoWS);
            servidor.start();
            
            System.out.println("✅ Servidor WebSocket iniciado en puerto: " + puertoWS);
            System.out.println("📡 Esperando conexiones...");
            System.out.println();
            System.out.println("Para conectar desde el navegador:");
            System.out.println("ws://localhost:" + puertoWS);
            System.out.println();
            System.out.println("Presiona Ctrl+C para detener el servidor");
            System.out.println("===========================================");
            
            // Mantener el servidor corriendo
            Thread.currentThread().join();
            
        } catch (Exception e) {
            System.err.println("❌ Error al iniciar el servidor: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
