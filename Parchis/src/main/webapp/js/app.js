// ============================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ============================================
const WS_URL = 'ws://localhost:8085';
let ws = null;
let miNombre = '';
let miAvatar = '';
let miColor = '';
let codigoSala = '';
let esAnfitrion = false;

// Control del juego
let esperandoSeleccionFicha = false;
let fichasDisponiblesParaMover = [];
let puedeTirarDado = false;

// Estado del juego
let estadoJuego = {
    jugadores: [],
    turnoActual: null,
    fichas: {},
    contadorSeis: 0,
    ultimoDado: 0
};

// Colores del juego
const COLORES = {
    ROJO: '#ff4757',
    AZUL: '#3742fa',
    VERDE: '#2ed573',
    AMARILLO: '#ffa502'
};

const COLORES_OSCUROS = {
    ROJO: '#c0392b',
    AZUL: '#2c3e50',
    VERDE: '#27ae60',
    AMARILLO: '#d35400'
};

// Casillas de salida para cada color
const CASILLAS_SALIDA = {
    ROJO: 0,
    VERDE: 17,
    AZUL: 34,
    AMARILLO: 51
};

// Casillas donde cada color entra a su pasillo de meta
const ENTRADA_PASILLO = {
    ROJO: 67,
    VERDE: 16,
    AZUL: 33,
    AMARILLO: 50
};

// Total de casillas en el tablero principal
const TOTAL_CASILLAS = 68;

// Casillas seguras
const CASILLAS_SEGURAS = [0, 5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63];

// Coordenadas del tablero (68 casillas del circuito principal)
const CASILLAS_TABLERO = generarCasillasTablero();

function generarCasillasTablero() {
    const casillas = [];
    const size = 800;
    const cs = size / 15;
    const c = (i) => cs * i + cs / 2;
    
    // Salida ROJO y subiendo (0-7)
    casillas.push({x: c(6), y: c(13), segura: true});
    casillas.push({x: c(6), y: c(12), segura: false});
    casillas.push({x: c(6), y: c(11), segura: false});
    casillas.push({x: c(6), y: c(10), segura: false});
    casillas.push({x: c(6), y: c(9), segura: false});
    casillas.push({x: c(5), y: c(8), segura: true});
    casillas.push({x: c(4), y: c(8), segura: false});
    casillas.push({x: c(3), y: c(8), segura: false});
    
    // Lado izquierdo (8-16)
    casillas.push({x: c(2), y: c(8), segura: false});
    casillas.push({x: c(1), y: c(8), segura: false});
    casillas.push({x: c(0), y: c(8), segura: false});
    casillas.push({x: c(0), y: c(7), segura: false});
    casillas.push({x: c(0), y: c(6), segura: true});
    casillas.push({x: c(1), y: c(6), segura: false});
    casillas.push({x: c(2), y: c(6), segura: false});
    casillas.push({x: c(3), y: c(6), segura: false});
    casillas.push({x: c(4), y: c(6), segura: false});
    
    // Salida VERDE y subiendo (17-25)
    casillas.push({x: c(5), y: c(6), segura: true});
    casillas.push({x: c(6), y: c(5), segura: false});
    casillas.push({x: c(6), y: c(4), segura: false});
    casillas.push({x: c(6), y: c(3), segura: false});
    casillas.push({x: c(6), y: c(2), segura: false});
    casillas.push({x: c(6), y: c(1), segura: true});
    casillas.push({x: c(6), y: c(0), segura: false});
    casillas.push({x: c(7), y: c(0), segura: false});
    casillas.push({x: c(8), y: c(0), segura: false});
    
    // Lado superior derecho (26-33)
    casillas.push({x: c(8), y: c(1), segura: false});
    casillas.push({x: c(8), y: c(2), segura: false});
    casillas.push({x: c(8), y: c(3), segura: false});
    casillas.push({x: c(8), y: c(4), segura: true});
    casillas.push({x: c(8), y: c(5), segura: false});
    casillas.push({x: c(9), y: c(6), segura: false});
    casillas.push({x: c(10), y: c(6), segura: false});
    casillas.push({x: c(11), y: c(6), segura: false});
    
    // Salida AZUL y bajando (34-42)
    casillas.push({x: c(12), y: c(6), segura: true});
    casillas.push({x: c(13), y: c(6), segura: false});
    casillas.push({x: c(14), y: c(6), segura: false});
    casillas.push({x: c(14), y: c(7), segura: false});
    casillas.push({x: c(14), y: c(8), segura: false});
    casillas.push({x: c(13), y: c(8), segura: true});
    casillas.push({x: c(12), y: c(8), segura: false});
    casillas.push({x: c(11), y: c(8), segura: false});
    casillas.push({x: c(10), y: c(8), segura: false});
    
    // Lado derecho bajando (43-50)
    casillas.push({x: c(9), y: c(8), segura: false});
    casillas.push({x: c(8), y: c(9), segura: false});
    casillas.push({x: c(8), y: c(10), segura: false});
    casillas.push({x: c(8), y: c(11), segura: true});
    casillas.push({x: c(8), y: c(12), segura: false});
    casillas.push({x: c(8), y: c(13), segura: false});
    casillas.push({x: c(8), y: c(14), segura: false});
    casillas.push({x: c(7), y: c(14), segura: false});
    
    // Salida AMARILLO y continuando (51-59)
    casillas.push({x: c(6), y: c(14), segura: true});
    casillas.push({x: c(6), y: c(13), segura: false});
    casillas.push({x: c(6), y: c(12), segura: false});
    casillas.push({x: c(6), y: c(11), segura: false});
    casillas.push({x: c(6), y: c(10), segura: false});
    casillas.push({x: c(5), y: c(8), segura: true});
    casillas.push({x: c(4), y: c(8), segura: false});
    casillas.push({x: c(3), y: c(8), segura: false});
    casillas.push({x: c(2), y: c(8), segura: false});
    
    // Completar circuito (60-67)
    casillas.push({x: c(1), y: c(8), segura: false});
    casillas.push({x: c(0), y: c(8), segura: false});
    casillas.push({x: c(0), y: c(7), segura: false});
    casillas.push({x: c(0), y: c(6), segura: true});
    casillas.push({x: c(1), y: c(6), segura: false});
    casillas.push({x: c(2), y: c(6), segura: false});
    casillas.push({x: c(3), y: c(6), segura: false});
    casillas.push({x: c(4), y: c(6), segura: false});
    
    return casillas;
}

// Posiciones de las casas
const CASAS_POSICIONES = {
    ROJO: [
        {x: 100, y: 580}, {x: 160, y: 580},
        {x: 100, y: 640}, {x: 160, y: 640}
    ],
    VERDE: [
        {x: 100, y: 100}, {x: 160, y: 100},
        {x: 100, y: 160}, {x: 160, y: 160}
    ],
    AZUL: [
        {x: 620, y: 100}, {x: 680, y: 100},
        {x: 620, y: 160}, {x: 680, y: 160}
    ],
    AMARILLO: [
        {x: 620, y: 580}, {x: 680, y: 580},
        {x: 620, y: 640}, {x: 680, y: 640}
    ]
};

// Pasillos de meta
const PASILLOS_META = {
    ROJO: [
        {x: 400, y: 680}, {x: 400, y: 627}, {x: 400, y: 574},
        {x: 400, y: 521}, {x: 400, y: 468}, {x: 400, y: 415},
        {x: 400, y: 400}
    ],
    VERDE: [
        {x: 80, y: 400}, {x: 133, y: 400}, {x: 186, y: 400},
        {x: 239, y: 400}, {x: 292, y: 400}, {x: 345, y: 400},
        {x: 400, y: 400}
    ],
    AZUL: [
        {x: 400, y: 80}, {x: 400, y: 133}, {x: 400, y: 186},
        {x: 400, y: 239}, {x: 400, y: 292}, {x: 400, y: 345},
        {x: 400, y: 400}
    ],
    AMARILLO: [
        {x: 720, y: 400}, {x: 667, y: 400}, {x: 614, y: 400},
        {x: 561, y: 400}, {x: 508, y: 400}, {x: 455, y: 400},
        {x: 400, y: 400}
    ]
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const pantallaSeleccion = document.getElementById('pantallaSeleccion');
const inputNombre = document.getElementById('inputNombre');
const avatares = document.querySelectorAll('.avatar-opcion');
const btnContinuar = document.getElementById('btnContinuar');

const pantallaPrincipal = document.getElementById('pantallaPrincipal');
const avatarUsuario = document.getElementById('avatarUsuario');
const nombreUsuario = document.getElementById('nombreUsuario');
const inputCodigo = document.getElementById('inputCodigo');
const btnUnirse = document.getElementById('btnUnirse');
const btnCrearSala = document.getElementById('btnCrearSala');
const mensajeError = document.getElementById('mensajeError');
const btnConfiguracion = document.getElementById('btnConfiguracion');

const pantallaSalaEspera = document.getElementById('pantallaSalaEspera');
const codigoSalaDisplay = document.getElementById('codigoSalaDisplay');
const btnCopiarCodigo = document.getElementById('btnCopiarCodigo');
const btnSalir = document.getElementById('btnSalir');
const listaJugadores = document.getElementById('listaJugadores');
const numJugadores = document.getElementById('numJugadores');
const btnIniciarPartida = document.getElementById('btnIniciarPartida');

const pantallaJuego = document.getElementById('pantallaJuego');
const tableroCanvas = document.getElementById('tablero');
const ctx = tableroCanvas.getContext('2d');
const dado = document.getElementById('dado');
const valorDado = document.getElementById('valorDado');
const btnTirarDado = document.getElementById('btnTirarDado');
const logEventos = document.getElementById('logEventos');

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarPantalla(pantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.add('hidden'));
    pantalla.classList.remove('hidden');
    console.log('[PANTALLA] Mostrando:', pantalla.id);
}

function agregarLog(texto, tipo = 'normal') {
    const p = document.createElement('p');
    const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    
    let emoji = '';
    let estilo = '';
    
    switch(tipo) {
        case 'importante':
            emoji = '⭐ ';
            estilo = 'color: #ffa502; font-weight: bold;';
            break;
        case 'exito':
            emoji = '✅ ';
            estilo = 'color: #2ed573; font-weight: bold;';
            break;
        case 'error':
            emoji = '❌ ';
            estilo = 'color: #ff4757;';
            break;
        case 'turno':
            emoji = '🎯 ';
            estilo = 'color: #f4d03f; font-weight: bold;';
            break;
    }
    
    p.innerHTML = `<span style="opacity:0.6">[${hora}]</span> <span style="${estilo}">${emoji}${texto}</span>`;
    logEventos.appendChild(p);
    logEventos.scrollTop = logEventos.scrollHeight;
}

function mostrarMensajeError(texto) {
    mensajeError.textContent = texto;
    mensajeError.style.display = 'block';
    setTimeout(() => {
        mensajeError.style.display = 'none';
    }, 3000);
}

function obtenerNombreJugador(color) {
    const jugador = estadoJuego.jugadores.find(j => j.color === color);
    return jugador ? jugador.nombre : color;
}
function mostrarDado(valor) {
    valorDado.textContent = `Resultado: ${valor}`;
    dado.innerHTML = `<img src="assets/D${valor}.jpg" alt="Dado ${valor}" style="width: 100%; height: 100%; border-radius: 15px;" onerror="this.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:4rem;font-weight:bold;color:#1a1a2e;\\'>${valor}</div>'">`;
}

// ============================================
// WEBSOCKET - MEJORADO
// ============================================
function conectarWebSocket() {
    console.log('[WS] Intentando conectar a:', WS_URL);
    
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('[WS] ✅ Conectado al servidor');
        agregarLog('Conectado al servidor', 'exito');
    };
    
    ws.onmessage = (event) => {
        try {
            const mensaje = JSON.parse(event.data);
            console.log('[WS] 📨 Mensaje recibido:', mensaje);
            manejarMensaje(mensaje);
        } catch (error) {
            console.error('[WS] Error parseando mensaje:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('[WS] ❌ Error:', error);
        agregarLog('Error de conexión al servidor', 'error');
    };
    
    ws.onclose = () => {
        console.log('[WS] ⚠️ Desconectado del servidor');
        agregarLog('Desconectado del servidor', 'error');
        setTimeout(conectarWebSocket, 3000);
    };
}

function enviarMensaje(datos) {
    if (!ws) {
        console.error('[WS] WebSocket no inicializado');
        agregarLog('Error: WebSocket no conectado', 'error');
        return;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
        console.error('[WS] WebSocket no conectado. Estado:', ws.readyState);
        console.error('[WS] Estados: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');
        agregarLog('Error: No hay conexión con el servidor', 'error');
        return;
    }
    
    datos.sala = codigoSala;
    const mensajeStr = JSON.stringify(datos);
    
    console.log('[WS] 📤 Enviando:', mensajeStr);
    ws.send(mensajeStr);
}

// ============================================
// MANEJO DE MENSAJES
// ============================================
function manejarMensaje(mensaje) {
    console.log('[WS] 📨 Procesando:', mensaje.tipo);
    
    switch (mensaje.tipo) {
        case 'CONEXION_EXITOSA':
            console.log('[WS] Conexión establecida');
            break;
            
        case 'REGISTRO_EXITOSO':
        case 'SALA_CREADA':
        case 'UNIDO_A_SALA':
            miColor = mensaje.color;
            console.log('[WS] Color asignado:', miColor);
            agregarLog(`Color asignado: ${miColor}`, 'importante');
            break;
            
        case 'ACTUALIZAR_LOBBY':
            actualizarLobby(mensaje);
            break;
            
        case 'PARTIDA_INICIADA':
            iniciarJuego(mensaje);
            break;
            
        case 'DADO_TIRADO':
        case 'DADO_RESULTADO':
            procesarDado(mensaje);
            break;
            
        case 'FICHAS_DISPONIBLES':
            recibirFichasDisponibles(mensaje);
            break;
            
        case 'FICHA_MOVIDA':
        case 'MOVIMIENTO_REALIZADO':
            procesarMovimiento(mensaje);
            break;
            
        case 'FICHA_COMIDA':
            procesarFichaComida(mensaje);
            break;
            
        case 'TURNO_EXTRA':
            procesarTurnoExtra(mensaje);
            break;
            
        case 'PENALIZACION_TRES_SEIS':
            procesarPenalizacionTresSeis(mensaje);
            break;
            
        case 'ESTADO_JUEGO':
            actualizarEstadoJuego(mensaje);
            break;
            
        case 'TURNO_CAMBIADO':
        case 'TURNO':
            cambiarTurno(mensaje);
            break;
            
        case 'PARTIDA_TERMINADA':
        case 'GANADOR':
            finalizarPartida(mensaje.ganador || mensaje.color);
            break;
            
        case 'ERROR':
            mostrarMensajeError(mensaje.mensaje);
            agregarLog(mensaje.mensaje, 'error');
            // Rehabilitar el dado en caso de error
            if (estadoJuego.turnoActual === miColor) {
                setTimeout(() => habilitarDado(), 1000);
            }
            break;
            
        default:
            console.warn('[WS] ⚠️ Tipo de mensaje no manejado:', mensaje.tipo);
    }
}

// ============================================
// PANTALLA 1: SELECCIÓN DE USUARIO
// ============================================
let avatarSeleccionado = '';

inputNombre.addEventListener('input', validarContinuar);

avatares.forEach(avatar => {
    avatar.addEventListener('click', () => {
        avatares.forEach(a => a.classList.remove('selected'));
        avatar.classList.add('selected');
        avatarSeleccionado = avatar.dataset.avatar;
        validarContinuar();
    });
});

function validarContinuar() {
    const nombre = inputNombre.value.trim();
    btnContinuar.disabled = !(nombre.length >= 2 && avatarSeleccionado);
}

btnContinuar.addEventListener('click', () => {
    miNombre = inputNombre.value.trim();
    miAvatar = avatarSeleccionado;
    
    console.log('[SELECCION] Usuario creado:', miNombre, miAvatar);
    
    localStorage.setItem('perfilUsuario', JSON.stringify({
        nombre: miNombre,
        avatar: miAvatar
    }));
    
    nombreUsuario.textContent = miNombre;
    avatarUsuario.src = `assets/${miAvatar}.jpg`;
    
    mostrarPantalla(pantallaPrincipal);
    conectarWebSocket();
});

// ============================================
// PANTALLA 2: PRINCIPAL
// ============================================
inputCodigo.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
});

btnUnirse.addEventListener('click', () => {
    const codigo = inputCodigo.value.trim();
    
    if (codigo.length !== 7) {
        mostrarMensajeError('Ingresa un código de 7 dígitos');
        return;
    }
    
    codigoSala = codigo;
    esAnfitrion = false;
    
    console.log('[PRINCIPAL] Uniéndose a sala:', codigoSala);
    
    enviarMensaje({
        accion: 'UNIRSE_SALA',
        nombre: miNombre,
        avatar: miAvatar
    });
    
    mostrarPantalla(pantallaSalaEspera);
    codigoSalaDisplay.textContent = codigoSala;
});

btnCrearSala.addEventListener('click', () => {
    codigoSala = Math.floor(1000000 + Math.random() * 9000000).toString();
    esAnfitrion = true;
    
    console.log('[PRINCIPAL] Sala creada:', codigoSala);
    
    enviarMensaje({
        accion: 'CREAR_SALA',
        nombre: miNombre,
        avatar: miAvatar
    });
    
    mostrarPantalla(pantallaSalaEspera);
    codigoSalaDisplay.textContent = codigoSala;
});

if (btnConfiguracion) {
    btnConfiguracion.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.clear();
            location.reload();
        }
    });
}

// ============================================
// PANTALLA 3: SALA DE ESPERA
// ============================================
btnCopiarCodigo.addEventListener('click', () => {
    navigator.clipboard.writeText(codigoSala);
    btnCopiarCodigo.textContent = '✅';
    setTimeout(() => {
        btnCopiarCodigo.textContent = '📋';
    }, 2000);
});

btnSalir.addEventListener('click', () => {
    if (confirm('¿Salir de la sala?')) {
        enviarMensaje({ accion: 'SALIR_SALA' });
        if (ws) ws.close();
        mostrarPantalla(pantallaPrincipal);
    }
});

btnIniciarPartida.addEventListener('click', () => {
    if (!esAnfitrion) {
        alert('Solo el anfitrión puede iniciar la partida');
        return;
    }
    
    if (estadoJuego.jugadores.length < 2) {
        alert('Se necesitan al menos 2 jugadores');
        return;
    }
    
    enviarMensaje({
        accion: 'INICIAR_PARTIDA'
    });
});

function actualizarLobby(datos) {
    estadoJuego.jugadores = datos.jugadores || [];
    numJugadores.textContent = estadoJuego.jugadores.length;
    
    listaJugadores.innerHTML = '';
    
    estadoJuego.jugadores.forEach(jugador => {
        const card = document.createElement('div');
        card.className = 'jugador-card';
        card.style.borderLeftColor = COLORES[jugador.color] || '#f4d03f';
        card.innerHTML = `
            <img src="assets/${jugador.avatar || 'personaje0'}.jpg" class="jugador-avatar" 
                 onerror="this.src='assets/personaje0.jpg'">
            <div class="jugador-info">
                <div class="jugador-nombre" style="color: ${COLORES[jugador.color]}">${jugador.nombre} ${jugador.nombre === miNombre ? '(Tú)' : ''}</div>
                <div class="jugador-estado">${jugador.color}</div>
            </div>
        `;
        listaJugadores.appendChild(card);
    });
    
    for (let i = estadoJuego.jugadores.length; i < 4; i++) {
        const vacio = document.createElement('div');
        vacio.className = 'jugador-vacio';
        vacio.textContent = 'Esperando jugador...';
        listaJugadores.appendChild(vacio);
    }
    
    btnIniciarPartida.disabled = estadoJuego.jugadores.length < 2 || !esAnfitrion;
}

// ============================================
// PANTALLA 4: JUEGO - INICIALIZACIÓN
// ============================================
function iniciarJuego(datos) {
    console.log('[JUEGO] ====== PARTIDA INICIADA ======');
    console.log('[JUEGO] Datos recibidos:', datos);
    
    estadoJuego.jugadores = datos.jugadores || [];
    estadoJuego.turnoActual = datos.turnoActual;
    estadoJuego.fichas = {};
    estadoJuego.contadorSeis = 0;
    estadoJuego.ultimoDado = 0;
    
    // VERIFICAR QUE TENGO MI COLOR ASIGNADO
    console.log('[JUEGO] Mi color asignado:', miColor);
    if (!miColor) {
        console.error('[JUEGO] ⚠️ NO TENGO COLOR ASIGNADO');
        const miJugador = estadoJuego.jugadores.find(j => j.nombre === miNombre);
        if (miJugador) {
            miColor = miJugador.color;
            console.log('[JUEGO] Color recuperado de jugadores:', miColor);
        }
    }
    
    // Inicializar fichas
    estadoJuego.jugadores.forEach(jugador => {
        console.log('[JUEGO] Inicializando fichas para:', jugador.nombre, jugador.color);
        for (let i = 1; i <= 4; i++) {
            const fichaId = `${jugador.color}_${i}`;
            estadoJuego.fichas[fichaId] = {
                id: fichaId,
                color: jugador.color,
                numero: i,
                posicion: -1,
                enCasa: true,
                enMeta: false,
                enPasillo: false,
                posicionPasillo: -1
            };
        }
    });
    
    mostrarPantalla(pantallaJuego);
    actualizarInfoJugadores();
    dibujarTablero();
    actualizarTurno();
    
    agregarLog('¡Partida iniciada!', 'exito');
    agregarLog(`Turno de: ${obtenerNombreJugador(estadoJuego.turnoActual)}`, 'turno');
}

function actualizarInfoJugadores() {
    const paneles = {
        ROJO: { name: document.querySelector('.player-rojo .player-name'), fichas: document.getElementById('fichasRojo') },
        AZUL: { name: document.querySelector('.player-azul .player-name'), fichas: document.getElementById('fichasAzul') },
        VERDE: { name: document.querySelector('.player-verde .player-name'), fichas: document.getElementById('fichasVerde') },
        AMARILLO: { name: document.querySelector('.player-amarillo .player-name'), fichas: document.getElementById('fichasAmarillo') }
    };
    
    Object.keys(paneles).forEach(color => {
        if (paneles[color].name) {
            paneles[color].name.textContent = color;
            paneles[color].name.style.opacity = '0.5';
        }
        if (paneles[color].fichas) {
            paneles[color].fichas.textContent = '0/4';
        }
    });
    
    estadoJuego.jugadores.forEach(jugador => {
        const panel = paneles[jugador.color];
        if (panel) {
            if (panel.name) {
                const esYo = jugador.color === miColor;
                const esTurno = jugador.color === estadoJuego.turnoActual;
                panel.name.textContent = `${jugador.nombre}${esYo ? ' (Tú)' : ''}${esTurno ? ' 🎲' : ''}`;
                panel.name.style.opacity = '1';
                panel.name.style.color = esTurno ? '#f4d03f' : '#fff';
            }
            
            let fichasEnMeta = 0;
            for (let i = 1; i <= 4; i++) {
                const ficha = estadoJuego.fichas[`${jugador.color}_${i}`];
                if (ficha && ficha.enMeta) fichasEnMeta++;
            }
            if (panel.fichas) {
                panel.fichas.textContent = `${fichasEnMeta}/4`;
            }
        }
    });
}

// ============================================
// DIBUJAR TABLERO
// ============================================
function dibujarTablero() {
    const width = tableroCanvas.width;
    const height = tableroCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Fondo del tablero
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, width, height);
    
    // Cruz central blanca
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width * 0.3, 0, width * 0.4, height);
    ctx.fillRect(0, height * 0.3, width, height * 0.4);
    
    // === CASAS DE COLORES ===
    dibujarCasa(50, 540, 190, 210, COLORES.ROJO, 'ROJO');
    dibujarCasa(50, 50, 190, 190, COLORES.VERDE, 'VERDE');
    dibujarCasa(560, 50, 190, 190, COLORES.AZUL, 'AZUL');
    dibujarCasa(560, 540, 190, 210, COLORES.AMARILLO, 'AMARILLO');
    
    // === PASILLOS DE META ===
    dibujarPasilloMeta('ROJO');
    dibujarPasilloMeta('VERDE');
    dibujarPasilloMeta('AZUL');
    dibujarPasilloMeta('AMARILLO');
    
    // === CENTRO (META) ===
    dibujarCentroMeta();
    
    // === CASILLAS DE SALIDA ===
    dibujarCasillaSalida(CASILLAS_TABLERO[0], COLORES.ROJO);
    dibujarCasillaSalida(CASILLAS_TABLERO[17], COLORES.VERDE);
    dibujarCasillaSalida(CASILLAS_TABLERO[34], COLORES.AZUL);
    dibujarCasillaSalida(CASILLAS_TABLERO[51], COLORES.AMARILLO);
    
    // === CASILLAS SEGURAS ===
    CASILLAS_SEGURAS.forEach(idx => {
        if (CASILLAS_TABLERO[idx] && ![0, 17, 34, 51].includes(idx)) {
            const casilla = CASILLAS_TABLERO[idx];
            ctx.beginPath();
            ctx.arc(casilla.x, casilla.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#888';
            ctx.fill();
        }
    });
    
    // === FICHAS ===
    dibujarTodasLasFichas();
}

function dibujarCasa(x, y, w, h, color, colorNombre) {
    // Fondo de la casa
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    
    // Borde
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    
    // Zona interior blanca
    const margin = 20;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + margin, y + margin, w - margin * 2, h - margin * 2);
    
    // Círculos para las fichas en casa
    const posiciones = CASAS_POSICIONES[colorNombre];
    if (posiciones) {
        posiciones.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
        });
    }
}

function dibujarPasilloMeta(color) {
    const pasillo = PASILLOS_META[color];
    if (!pasillo) return;
    
    ctx.fillStyle = COLORES[color];
    
    // Dibujar cada casilla del pasillo (excepto la meta central)
    for (let i = 0; i < pasillo.length - 1; i++) {
        const pos = pasillo[i];
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function dibujarCentroMeta() {
    const cx = 400;
    const cy = 400;
    const size = 60;
    
    // Triángulos de colores
    const colores = [COLORES.ROJO, COLORES.VERDE, COLORES.AZUL, COLORES.AMARILLO];
    const angulos = [Math.PI/2, Math.PI, -Math.PI/2, 0];
    
    colores.forEach((color, i) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angulos[i] - 0.5) * size, cy + Math.sin(angulos[i] - 0.5) * size);
        ctx.lineTo(cx + Math.cos(angulos[i] + 0.5) * size, cy + Math.sin(angulos[i] + 0.5) * size);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function dibujarCasillaSalida(casilla, color) {
    if (!casilla) return;
    
    ctx.beginPath();
    ctx.arc(casilla.x, casilla.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Estrella
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', casilla.x, casilla.y);
}

function dibujarTodasLasFichas() {
    // Agrupar fichas por posición
    const fichasPorPosicion = {};
    
    Object.values(estadoJuego.fichas).forEach(ficha => {
        if (ficha.enMeta) return;
        
        const pos = obtenerPosicionFicha(ficha);
        if (!pos) return;
        
        const key = `${Math.round(pos.x)}_${Math.round(pos.y)}`;
        if (!fichasPorPosicion[key]) {
            fichasPorPosicion[key] = [];
        }
        fichasPorPosicion[key].push(ficha);
    });
    
    // Dibujar fichas (con offset si hay varias en la misma posición)
    Object.values(fichasPorPosicion).forEach(grupo => {
        grupo.forEach((ficha, index) => {
            const pos = obtenerPosicionFicha(ficha);
            const offset = grupo.length > 1 ? (index - (grupo.length - 1) / 2) * 18 : 0;
            dibujarFicha(pos.x + offset, pos.y, ficha);
        });
    });
}

function obtenerPosicionFicha(ficha) {
    if (ficha.enCasa) {
        const posiciones = CASAS_POSICIONES[ficha.color];
        if (!posiciones) return null;
        return posiciones[ficha.numero - 1];
    }
    
    if (ficha.enPasillo && ficha.posicionPasillo >= 0) {
        const pasillo = PASILLOS_META[ficha.color];
        if (!pasillo || ficha.posicionPasillo >= pasillo.length) return null;
        return pasillo[ficha.posicionPasillo];
    }
    
    if (ficha.posicion >= 0 && ficha.posicion < CASILLAS_TABLERO.length) {
        return CASILLAS_TABLERO[ficha.posicion];
    }
    
    return null;
}

function dibujarFicha(x, y, ficha) {
    const esSeleccionable = fichasDisponiblesParaMover.includes(ficha.id);
    
    // Sombra
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    
    // Cuerpo de la ficha con gradiente
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, 20);
    gradient.addColorStop(0, COLORES[ficha.color]);
    gradient.addColorStop(1, COLORES_OSCUROS[ficha.color]);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = esSeleccionable ? '#FFD700' : '#fff';
    ctx.lineWidth = esSeleccionable ? 4 : 2;
    ctx.stroke();
    
    // Efecto de brillo si es seleccionable
    if (esSeleccionable) {
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Número de la ficha
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ficha.numero, x, y);
}

// ============================================
// LÓGICA DEL DADO - CORREGIDO
// ============================================
btnTirarDado.addEventListener('click', tirarDado);

function tirarDado() {
    console.log('[DADO] === INTENTANDO TIRAR DADO ===');
    console.log('[DADO] Turno actual:', estadoJuego.turnoActual);
    console.log('[DADO] Mi color:', miColor);
    console.log('[DADO] Puedo tirar:', puedeTirarDado);
    
    if (estadoJuego.turnoActual !== miColor) {
        console.log('[DADO] ERROR: No es mi turno');
        agregarLog('No es tu turno', 'error');
        return;
    }
    
    if (!puedeTirarDado) {
        console.log('[DADO] ERROR: No puedo tirar ahora');
        agregarLog('No puedes tirar el dado ahora', 'error');
        return;
    }
    
    console.log('[DADO] ✓ Validación pasada, enviando mensaje...');
    puedeTirarDado = false;
    btnTirarDado.disabled = true;
    
    // Animación del dado
    let contador = 0;
    const intervalo = setInterval(() => {
        const valorAleatorio = Math.floor(Math.random() * 6) + 1;
        mostrarDado(valorAleatorio);
        contador++;
        if (contador > 10) {
            clearInterval(intervalo);
        }
    }, 80);
    
    // ENVIAR MENSAJE AL SERVIDOR
    const mensaje = { 
        accion: 'TIRAR_DADO'
    };
    
    console.log('[DADO] Enviando mensaje:', mensaje);
    enviarMensaje(mensaje);
}
// ============================================
// PROCESAR DADO - MEJORADO
// ============================================
function procesarDado(mensaje) {
    console.log('[DADO] === PROCESANDO RESULTADO ===');
    console.log('[DADO] Mensaje completo:', mensaje);
    
    const valor = mensaje.valor;
    estadoJuego.ultimoDado = valor;
    estadoJuego.contadorSeis = mensaje.contadorSeis || 0;
    
    console.log('[DADO] Resultado:', valor, 'Contador 6:', estadoJuego.contadorSeis);
    
    // Mostrar resultado del dado
    setTimeout(() => {
        mostrarDado(valor);
    }, 500);
    
    const colorJugador = mensaje.color; // USAR SOLO COLOR, NO NOMBRE
    const nombreJugador = obtenerNombreJugador(colorJugador);
    agregarLog(`${nombreJugador} tiró un ${valor}`, 'importante');
    
    // NUEVO: Verificar si el backend indica que no hay fichas disponibles
    if (mensaje.sinFichasDisponibles) {
        console.log('[DADO] Backend indica: sin fichas disponibles');
        agregarLog('No hay fichas disponibles para mover');
        // El backend ya cambió el turno, no hacer nada más
        return;
    }
    
    // CORREGIDO: Solo verificar fichas si ES MI COLOR
    if (colorJugador === miColor) {
        console.log('[DADO] ✓ Es mi turno, verificando mis fichas...');
        setTimeout(() => {
            verificarFichasDisponibles(valor);
        }, 800);
    } else {
        console.log('[DADO] ✗ No es mi turno, turno de:', colorJugador);
    }
}
// ============================================
// LÓGICA DE MOVIMIENTO
// ============================================
function verificarFichasDisponibles(valorDado) {
    console.log('[FICHAS] Verificando fichas disponibles para dado:', valorDado);
    
    fichasDisponiblesParaMover = [];
    
    Object.values(estadoJuego.fichas).forEach(ficha => {
        if (ficha.color !== miColor || ficha.enMeta) return;
        
        // Si está en casa, SOLO puede salir con 5
        if (ficha.enCasa) {
            if (valorDado === 5) {
                fichasDisponiblesParaMover.push(ficha.id);
                console.log('[FICHAS] ✓ Ficha puede salir de casa:', ficha.id);
            }
        } 
        // Si está en el pasillo
        else if (ficha.enPasillo) {
            // En pasillo: verificar que no se pase de la meta (posición 6 es la meta)
            if (ficha.posicionPasillo + valorDado <= 6) {
                fichasDisponiblesParaMover.push(ficha.id);
                console.log('[FICHAS] ✓ Ficha puede avanzar en pasillo:', ficha.id);
            } else {
                console.log('[FICHAS] ✗ Ficha se pasaría de la meta:', ficha.id);
            }
        } 
        // Si está en el tablero normal
        else {
            // En tablero: siempre puede moverse (el backend verificará si puede entrar al pasillo)
            fichasDisponiblesParaMover.push(ficha.id);
            console.log('[FICHAS] ✓ Ficha puede moverse en tablero:', ficha.id);
        }
    });
    
    console.log('[FICHAS] Total disponibles:', fichasDisponiblesParaMover.length);
    
    if (fichasDisponiblesParaMover.length === 0) {
        agregarLog('No hay fichas disponibles para mover');
        // No hacer nada, esperar a que el backend cambie el turno
    } else {
        mostrarFichasDisponibles();
    }
}

// ============================================
// NUEVO: Mostrar fichas disponibles
// ============================================
function mostrarFichasDisponibles() {
    if (fichasDisponiblesParaMover.length === 1) {
        // Solo una ficha, mover automáticamente
        agregarLog('Moviendo ficha automáticamente...');
        setTimeout(() => {
            moverFichaSeleccionada(fichasDisponiblesParaMover[0]);
        }, 500);
    } else if (fichasDisponiblesParaMover.length > 1) {
        // Varias fichas disponibles
        esperandoSeleccionFicha = true;
        agregarLog('🎯 Selecciona una ficha para mover', 'turno');
        dibujarTablero(); // Redibujar para mostrar fichas resaltadas
    }
}

// ============================================
// NUEVO: Recibir fichas disponibles del servidor
// ============================================
function recibirFichasDisponibles(mensaje) {
    fichasDisponiblesParaMover = mensaje.fichas || [];
    
    console.log('[FICHAS] Servidor indica fichas disponibles:', fichasDisponiblesParaMover);
    
    if (fichasDisponiblesParaMover.length === 0) {
        agregarLog('No hay fichas disponibles para mover');
        // El servidor cambiará el turno automáticamente
    } else {
        mostrarFichasDisponibles();
    }
}

// Click en el tablero para seleccionar ficha
tableroCanvas.addEventListener('click', (e) => {
    if (!esperandoSeleccionFicha || estadoJuego.turnoActual !== miColor) return;
    
    const rect = tableroCanvas.getBoundingClientRect();
    const scaleX = tableroCanvas.width / rect.width;
    const scaleY = tableroCanvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    console.log('[CLICK] Posición:', clickX, clickY);
    
    // Buscar ficha clickeada
    for (const fichaId of fichasDisponiblesParaMover) {
        const ficha = estadoJuego.fichas[fichaId];
        const pos = obtenerPosicionFicha(ficha);
        
        if (!pos) continue;
        
        const distancia = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2);
        
        if (distancia <= 30) {
            console.log('[CLICK] Ficha seleccionada:', fichaId);
            moverFichaSeleccionada(fichaId);
            return;
        }
    }
});

function moverFichaSeleccionada(fichaId) {
    console.log('[MOVER] Moviendo ficha:', fichaId);
    
    esperandoSeleccionFicha = false;
    fichasDisponiblesParaMover = [];
    
    const ficha = estadoJuego.fichas[fichaId];
    
    enviarMensaje({
        accion: 'MOVER_FICHA',
        fichaId: ficha.numero,
        color: ficha.color,
        pasos: estadoJuego.ultimoDado
    });
    
    dibujarTablero();
}

function procesarMovimiento(mensaje) {
    console.log('[MOVIMIENTO] Procesando:', mensaje);
    
    // Actualizar estado de la ficha
    if (mensaje.fichaEstado) {
        const fichaId = `${mensaje.fichaEstado.color}_${mensaje.fichaEstado.numero}`;
        const ficha = estadoJuego.fichas[fichaId];
        if (ficha) {
            ficha.enCasa = mensaje.fichaEstado.enCasa;
            ficha.posicion = mensaje.fichaEstado.posicion;
            ficha.enMeta = mensaje.fichaEstado.enMeta || false;
            ficha.enPasillo = mensaje.fichaEstado.enPasillo || false;
            ficha.posicionPasillo = mensaje.fichaEstado.posicionPasillo || -1;
        }
    }
    
    const jugadorNombre = obtenerNombreJugador(mensaje.jugador || mensaje.color);
    
    if (mensaje.salioDeCasa) {
        agregarLog(`${jugadorNombre} sacó una ficha al tablero`, 'exito');
    } else {
        agregarLog(`${jugadorNombre} movió una ficha`);
    }
    
    if (mensaje.llegadaMeta) {
        agregarLog(`¡${jugadorNombre} llevó una ficha a la META!`, 'exito');
    }
    
    if (mensaje.fichaCumida) {
        agregarLog(`¡${jugadorNombre} comió una ficha! +20 casillas`, 'exito');
    }
    
    dibujarTablero();
    actualizarInfoJugadores();
}

// ============================================
// POST-MOVIMIENTO - CORREGIDO
// ============================================
function manejarPostMovimiento() {
    console.log('[POST-MOV] Esperando respuesta del servidor...');
    
    // Deshabilitar el dado temporalmente mientras el servidor decide
    deshabilitarDado();
    
    // El servidor decidirá:
    // - Enviar TURNO_EXTRA si corresponde (6 o 5+ficha)
    // - Enviar PENALIZACION_TRES_SEIS si sacó tres 6
    // - Enviar TURNO_CAMBIADO para pasar al siguiente jugador
    
    // No hacer nada más aquí, esperar mensaje del servidor
}

// ============================================
// NUEVO: Procesar turno extra
// ============================================
function procesarTurnoExtra(mensaje) {
    const motivo = mensaje.motivo || ''; // 'SACO_SEIS' o 'SACO_CINCO_Y_FICHA'
    const contador = mensaje.contadorSeis || 0;
    
    console.log('[TURNO_EXTRA] Motivo:', motivo, 'Contador:', contador);
    
    estadoJuego.contadorSeis = contador; // Actualizar contador
    
    if (motivo === 'SACO_SEIS') {
        if (contador >= 3) {
            // Esto no debería pasar aquí, pero por seguridad
            agregarLog('¡Tres 6 seguidos! El servidor manejará la penalización', 'error');
        } else {
            agregarLog(`¡Sacaste 6! Tira de nuevo (${contador}/3)`, 'exito');
        }
    } else if (motivo === 'SACO_CINCO_Y_FICHA') {
        agregarLog('¡Sacaste 5 y una ficha! Tienes turno extra', 'exito');
    } else {
        agregarLog('¡Turno extra!', 'exito');
    }
    
    // El servidor confirmó el turno extra, habilitar dado
    if (mensaje.color === miColor || mensaje.jugador === miNombre) {
        setTimeout(() => {
            habilitarDado();
        }, 500);
    }
}

// ============================================
// NUEVO: Procesar penalización de tres 6
// ============================================
function procesarPenalizacionTresSeis(mensaje) {
    const fichaId = mensaje.fichaId;
    const ficha = estadoJuego.fichas[fichaId];
    
    if (ficha) {
        ficha.enCasa = true;
        ficha.posicion = -1;
        ficha.enPasillo = false;
        ficha.posicionPasillo = -1;
    }
    
    const jugadorNombre = obtenerNombreJugador(mensaje.jugador || mensaje.color);
    agregarLog(`¡${jugadorNombre} sacó tres 6 seguidos! Ficha regresa a casa`, 'error');
    
    estadoJuego.contadorSeis = 0; // Reiniciar contador
    
    dibujarTablero();
    
    // El turno cambiará automáticamente después
}

function procesarFichaComida(mensaje) {
    const fichaComidaId = mensaje.fichaComidaId;
    const ficha = estadoJuego.fichas[fichaComidaId];
    
    if (ficha) {
        ficha.enCasa = true;
        ficha.posicion = -1;
        ficha.enPasillo = false;
        ficha.posicionPasillo = -1;
    }
    
    agregarLog(`¡Ficha comida! +20 casillas de bonus`, 'exito');
    
    dibujarTablero();
}

// ============================================
// CAMBIO DE TURNO - CORREGIDO
// ============================================
function cambiarTurno(mensaje) {
    console.log('[TURNO] Cambiando a:', mensaje.turnoActual);
    
    estadoJuego.turnoActual = mensaje.turnoActual;
    estadoJuego.contadorSeis = mensaje.contadorSeis || 0; // NUEVO: Usar valor del servidor
    estadoJuego.ultimoDado = 0;
    fichasDisponiblesParaMover = [];
    esperandoSeleccionFicha = false;
    
    actualizarTurno();
    actualizarInfoJugadores();
    dibujarTablero();
    
    const nombreJugador = obtenerNombreJugador(mensaje.turnoActual);
    agregarLog(`Turno de: ${nombreJugador}`, 'turno');
}

function actualizarTurno() {
    if (estadoJuego.turnoActual === miColor) {
        habilitarDado();
        agregarLog('¡Es tu turno! Tira el dado', 'exito');
    } else {
        deshabilitarDado();
    }
}

function habilitarDado() {
    puedeTirarDado = true;
    btnTirarDado.disabled = false;
    btnTirarDado.style.opacity = '1';
    btnTirarDado.style.animation = 'pulse 1s infinite';
}

function deshabilitarDado() {
    puedeTirarDado = false;
    btnTirarDado.disabled = true;
    btnTirarDado.style.opacity = '0.5';
    btnTirarDado.style.animation = 'none';
}

// ============================================
// ACTUALIZAR ESTADO DEL JUEGO
// ============================================
function actualizarEstadoJuego(mensaje) {
    if (mensaje.fichas) {
        mensaje.fichas.forEach(fichaData => {
            const fichaId = `${fichaData.color}_${fichaData.numeroFicha || fichaData.numero}`;
            const ficha = estadoJuego.fichas[fichaId];
            if (ficha) {
                ficha.posicion = fichaData.posicion;
                ficha.enCasa = fichaData.enCasa;
                ficha.enMeta = fichaData.enMeta;
                ficha.enPasillo = fichaData.enPasillo || false;
                ficha.posicionPasillo = fichaData.posicionPasillo || -1;
            }
        });
        
        dibujarTablero();
        actualizarInfoJugadores();
    }
    
    if (mensaje.turnoActual) {
        estadoJuego.turnoActual = mensaje.turnoActual;
        actualizarTurno();
    }
    
    if (mensaje.contadorSeis !== undefined) {
        estadoJuego.contadorSeis = mensaje.contadorSeis;
    }
}

// ============================================
// FIN DEL JUEGO
// ============================================
function finalizarPartida(ganador) {
    const nombreGanador = obtenerNombreJugador(ganador);
    
    agregarLog(`🏆🏆🏆 ¡${nombreGanador} HA GANADO! 🏆🏆🏆`, 'exito');
    
    setTimeout(() => {
        const esGanador = ganador === miColor;
        const mensaje = esGanador 
            ? '🎉 ¡FELICIDADES! ¡HAS GANADO!' 
            : `${nombreGanador} ha ganado la partida`;
            
        if (confirm(`${mensaje}\n\n¿Volver al inicio?`)) {
            location.reload();
        }
    }, 2000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
console.log('[APP] 🎲 Parchís Web cargado');

// Añadir estilos de animación
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(244, 208, 63, 0.5); }
        50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(244, 208, 63, 0.8); }
    }
`;
document.head.appendChild(styleSheet);

window.addEventListener('DOMContentLoaded', () => {
    mostrarPantalla(pantallaSeleccion);
    localStorage.removeItem('perfilUsuario');
});




