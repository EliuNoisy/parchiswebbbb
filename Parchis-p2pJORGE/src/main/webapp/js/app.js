// ============================================
// PARCHÍS - APLICACIÓN PRINCIPAL (P2P PeerJS)
// ============================================

// ===== VARIABLES PRINCIPALES =====
let p2p = null;
let miNombre = '';
let miAvatar = '';
let miColor = '';
let codigoSala = '';
let esAnfitrion = false;

let esperandoSeleccionFicha = false;
let fichasDisponiblesParaMover = [];
let puedeTirarDado = false;

let estadoJuego = {
    jugadores: [],
    turnoActual: null,
    fichas: {},
    contadorSeis: 0,
    ultimoDado: 0
};

// Colores de los jugadores
const COLORES = {
    ROJO: '#ff4757',
    AZUL: '#3742fa',
    VERDE: '#2ed573',
    AMARILLO: '#fffb02'
};

const COLORES_OSCUROS = {
    ROJO: '#c0392b',
    AZUL: '#2c3e50',
    VERDE: '#27ae60',
    AMARILLO: '#d35400'
};

// Posiciones de inicio de fichas (casas)
const CASAS_POSICIONES = {
    ROJO: [{x:120,y:600},{x:180,y:600},{x:120,y:660},{x:180,y:660}],
    VERDE: [{x:120,y:120},{x:180,y:120},{x:120,y:180},{x:180,y:180}],
    AZUL: [{x:620,y:120},{x:680,y:120},{x:620,y:180},{x:680,y:180}],
    AMARILLO: [{x:620,y:600},{x:680,y:600},{x:620,y:660},{x:680,y:660}]
};

// Pasillos hacia la meta
const PASILLOS_META = {
    ROJO: [{x:400,y:680},{x:400,y:627},{x:400,y:574},{x:400,y:521},{x:400,y:468},{x:400,y:415},{x:400,y:400}],
    VERDE: [{x:120,y:400},{x:173,y:400},{x:226,y:400},{x:279,y:400},{x:332,y:400},{x:385,y:400},{x:400,y:400}],
    AZUL: [{x:400,y:120},{x:400,y:173},{x:400,y:226},{x:400,y:279},{x:400,y:332},{x:400,y:385},{x:400,y:400}],
    AMARILLO: [{x:680,y:400},{x:627,y:400},{x:574,y:400},{x:521,y:400},{x:468,y:400},{x:415,y:400},{x:400,y:400}]
};

// Generar casillas del tablero (68 casillas)
function generarCasillasTablero() {
    const casillas = [];
    const size = 800;
    const cellSize = size / 15;
    const c = (i) => cellSize * i + cellSize / 2;
    
    const coords = [
        // ROJO (Abajo) - de 0 a 16
        [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],
        [2,8],[1,8],[0,8],[0,7],[0,6],
        // VERDE (Izquierda) - de 17 a 33
        [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],
        [6,2],[6,1],[6,0],[7,0],[8,0],
        // AZUL (Arriba) - de 34 a 50
        [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],
        [12,6],[13,6],[14,6],[14,7],[14,8],
        // AMARILLO (Derecha) - de 51 a 67
        [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],
        [8,12],[8,13],[8,14],[7,14],[6,14]
    ];
    
    coords.forEach(([x, y]) => casillas.push({x: c(x), y: c(y)}));
    return casillas;
}

const CASILLAS_TABLERO = generarCasillasTablero();

// ===== REFERENCIAS DOM =====
let pantallaSeleccion, pantallaPrincipal, pantallaSalaEspera, pantallaJuego;
let inputNombre, btnContinuar, avatares;
let inputCodigo, btnUnirse, btnCrearSala, mensajeError;
let codigoSalaDisplay, btnCopiarCodigo, btnSalir, listaJugadores, numJugadores, btnIniciarPartida;
let tableroCanvas, ctx, btnTirarDado, valorDado, logEventos;

// ===== FUNCIONES DE UI =====
function mostrarPantalla(pantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.add('hidden'));
    if (pantalla) pantalla.classList.remove('hidden');
}

function mostrarMensajeError(texto) {
    if (!mensajeError) return;
    mensajeError.textContent = texto;
    mensajeError.style.display = 'block';
    setTimeout(() => mensajeError.style.display = 'none', 4000);
}

function agregarLog(texto) {
    if (!logEventos) return;
    const p = document.createElement('p');
    const timestamp = new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    p.textContent = `[${timestamp}] ${texto}`;
    logEventos.appendChild(p);
    logEventos.scrollTop = logEventos.scrollHeight;
}

// ===== INICIALIZACIÓN DOM =====
function initDOM() {
    pantallaSeleccion   = document.getElementById('pantallaSeleccion');
    pantallaPrincipal   = document.getElementById('pantallaPrincipal');
    pantallaSalaEspera  = document.getElementById('pantallaSalaEspera');
    pantallaJuego       = document.getElementById('pantallaJuego');

    inputNombre   = document.getElementById('inputNombre');
    btnContinuar  = document.getElementById('btnContinuar');
    avatares      = document.querySelectorAll('.avatar-opcion');

    inputCodigo   = document.getElementById('inputCodigo');
    btnUnirse     = document.getElementById('btnUnirse');
    btnCrearSala  = document.getElementById('btnCrearSala');
    mensajeError  = document.getElementById('mensajeError');

    codigoSalaDisplay = document.getElementById('codigoSalaDisplay');
    btnCopiarCodigo   = document.getElementById('btnCopiarCodigo');
    btnSalir          = document.getElementById('btnSalir');
    listaJugadores    = document.getElementById('listaJugadores');
    numJugadores      = document.getElementById('numJugadores');
    btnIniciarPartida = document.getElementById('btnIniciarPartida');

    tableroCanvas = document.getElementById('tablero');
    if (tableroCanvas) {
        ctx = tableroCanvas.getContext('2d');
        tableroCanvas.width = 800;
        tableroCanvas.height = 800;
    }

    btnTirarDado = document.getElementById('btnTirarDado');
    valorDado    = document.getElementById('valorDado');
    logEventos   = document.getElementById('logEventos');
}

// ===== LOBBY =====
function actualizarLobby() {
    if (!listaJugadores || !numJugadores) return;

    listaJugadores.innerHTML = '';
    
    // Crear 4 slots
    for (let i = 0; i < 4; i++) {
        const jugador = estadoJuego.jugadores[i];
        
        if (jugador) {
            const div = document.createElement('div');
            div.className = 'jugador-card';
            div.innerHTML = `
                <img src="assets/${jugador.avatar}.png" alt="${jugador.nombre}" class="jugador-avatar">
                <div class="jugador-info">
                    <div class="jugador-nombre">${jugador.nombre}</div>
                    <div class="jugador-estado" style="color: ${COLORES[jugador.color] || '#aaa'}">
                        ${jugador.color}
                    </div>
                </div>
            `;
            listaJugadores.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = 'jugador-vacio';
            div.textContent = 'Esperando jugador...';
            listaJugadores.appendChild(div);
        }
    }
    
    numJugadores.textContent = estadoJuego.jugadores.length;

    if (btnIniciarPartida) {
        const soyHost = esAnfitrion || (p2p && p2p.isHost);
        btnIniciarPartida.disabled = !(soyHost && estadoJuego.jugadores.length >= 2);
    }
}

// ===== P2P =====
function initP2P() {
    p2p = new P2PNetwork();

    p2p.onLobbyUpdate = (jugadores) => {
        estadoJuego.jugadores = jugadores;
        actualizarLobby();
    };

    p2p.onPlayerJoined = (player) => {
        agregarLog(`✅ ${player.nombre} se conectó (${player.color})`);
    };

    p2p.onPlayerLeft = (player) => {
        agregarLog(`❌ ${player.nombre} se desconectó`);
    };

    p2p.onGameMessage = (msg) => {
        if (msg.tipo === 'ACTUALIZAR_LOBBY') {
            estadoJuego.jugadores = msg.jugadores || [];
            actualizarLobby();
            return;
        }
        manejarMensajeJuego(msg);
    };

    p2p.onError = (error) => {
        mostrarMensajeError(error);
        agregarLog(`⚠️ Error: ${error}`);
    };
}

// ===== EVENTOS UI =====
function setupEventos() {
    let avatarSeleccionado = '';

    function validarContinuar() {
        const nombreOk = inputNombre && inputNombre.value.trim().length >= 2;
        const avatarOk = avatarSeleccionado !== '';
        if (!btnContinuar) return;
        btnContinuar.disabled = !(nombreOk && avatarOk);
        btnContinuar.style.opacity = btnContinuar.disabled ? '0.5' : '1';
    }

    if (inputNombre) {
        inputNombre.addEventListener('input', validarContinuar);
    }

    if (avatares && avatares.length) {
        avatares.forEach(a => {
            a.addEventListener('click', () => {
                avatares.forEach(x => x.classList.remove('selected'));
                a.classList.add('selected');
                avatarSeleccionado = a.dataset.avatar;
                validarContinuar();
            });
        });
    }

    if (btnContinuar) {
        btnContinuar.addEventListener('click', () => {
            if (btnContinuar.disabled) return;
            miNombre = inputNombre.value.trim();
            miAvatar = avatarSeleccionado;
            document.getElementById('nombreUsuario').textContent = miNombre;
            document.getElementById('avatarUsuario').src = `assets/${miAvatar}.png`;
            initP2P();
            mostrarPantalla(pantallaPrincipal);
        });
    }

    if (btnCrearSala) {
        btnCrearSala.addEventListener('click', async () => {
            btnCrearSala.disabled = true;
            btnCrearSala.textContent = 'Creando sala...';
            
            try {
                const result = await p2p.createRoom({ nombre: miNombre, avatar: miAvatar });
                codigoSala = result.roomCode;
                miColor = result.player.color;
                esAnfitrion = true;

                codigoSalaDisplay.textContent = codigoSala;
                mostrarPantalla(pantallaSalaEspera);
                estadoJuego.jugadores = p2p.gameState.jugadores;
                actualizarLobby();
                agregarLog(`🎮 Sala creada. Código: ${codigoSala}`);
            } catch (e) {
                mostrarMensajeError('Error al crear sala: ' + e.message);
                btnCrearSala.disabled = false;
                btnCrearSala.textContent = 'CREAR NUEVA SALA';
            }
        });
    }

    if (btnUnirse) {
        btnUnirse.addEventListener('click', async () => {
            const codigo = inputCodigo.value.trim();
            if (!codigo) {
                mostrarMensajeError('Ingrese el código de la sala');
                return;
            }
            
            btnUnirse.disabled = true;
            btnUnirse.textContent = 'Conectando...';
            
            try {
                const result = await p2p.joinRoom(codigo, { nombre: miNombre, avatar: miAvatar });
                codigoSala = result.roomCode;
                miColor = result.player.color;
                esAnfitrion = false;

                codigoSalaDisplay.textContent = codigoSala;
                mostrarPantalla(pantallaSalaEspera);
                estadoJuego.jugadores = p2p.gameState.jugadores;
                actualizarLobby();
                agregarLog(`✅ Conectado a sala ${codigoSala}`);
            } catch (e) {
                mostrarMensajeError(e.message || 'No se pudo unir a la sala');
                btnUnirse.disabled = false;
                btnUnirse.textContent = 'UNIRSE';
            }
        });
    }

    if (btnCopiarCodigo) {
        btnCopiarCodigo.addEventListener('click', () => {
            if (!codigoSala) return;
            navigator.clipboard.writeText(codigoSala).then(() => {
                const originalText = btnCopiarCodigo.textContent;
                btnCopiarCodigo.textContent = '✅';
                setTimeout(() => btnCopiarCodigo.textContent = originalText, 2000);
            });
        });
    }

    if (btnSalir) {
        btnSalir.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres salir?')) {
                if (p2p) p2p.disconnect();
                location.reload();
            }
        });
    }

    if (btnIniciarPartida) {
        btnIniciarPartida.addEventListener('click', () => {
            if (!esAnfitrion) return;
            if (estadoJuego.jugadores.length < 2) return;
            
            btnIniciarPartida.disabled = true;
            btnIniciarPartida.textContent = 'Iniciando...';
            
            setTimeout(() => {
                p2p.iniciarPartida();
                agregarLog('🎲 ¡Partida iniciada!');
            }, 500);
        });
    }

    if (btnTirarDado) {
        btnTirarDado.addEventListener('click', tirarDado);
    }

    if (tableroCanvas) {
        tableroCanvas.addEventListener('click', handleClickTablero);
    }
}

// ===== JUEGO =====
function manejarMensajeJuego(msg) {
    switch (msg.tipo) {
        case 'PARTIDA_INICIADA':
            estadoJuego = msg.gameState;
            miColor = p2p.getMyColor();
            mostrarPantalla(pantallaJuego);
            actualizarInfoJugadores();
            dibujarTablero();
            actualizarControlTurno();
            agregarLog(`🎮 Partida iniciada. Turno: ${estadoJuego.turnoActual}`);
            break;

        case 'DADO_TIRADO':
            estadoJuego.ultimoDado = msg.valor;
            estadoJuego.contadorSeis = msg.contadorSeis || 0;
            if (valorDado) valorDado.textContent = `Resultado: ${msg.valor}`;
            agregarLog(`🎲 ${estadoJuego.turnoActual} sacó un ${msg.valor}`);
            
            if (msg.contadorSeis >= 3) {
                agregarLog(`⚠️ Tres 6 seguidos! Pierde turno`);
            }
            
            // ⚠️ NUEVO: Habilitar botón si sacó 6
            if (msg.valor === 6 && estadoJuego.turnoActual === miColor) {
                puedeTirarDado = false; // Espera a ver si hay movimientos
            }
            break;

        case 'SIN_MOVIMIENTOS':
            agregarLog(`❌ Sin movimientos válidos`);
            break;

        case 'PUEDE_TIRAR_OTRA_VEZ':
            agregarLog(`🎲 Sacaste 6, ¡tira de nuevo!`);
            // ⚠️ NUEVO: Habilitar botón de dado otra vez
            if (estadoJuego.turnoActual === miColor) {
                puedeTirarDado = true;
                if (btnTirarDado) {
                    btnTirarDado.disabled = false;
                    btnTirarDado.style.opacity = '1';
                }
            }
            break;

        case 'FICHAS_DISPONIBLES':
            fichasDisponiblesParaMover = msg.fichas || [];
            esperandoSeleccionFicha = fichasDisponiblesParaMover.length > 0;
            
            if (fichasDisponiblesParaMover.length === 0) {
                agregarLog(`❌ Sin movimientos válidos`);
            } else {
                agregarLog(`✅ ${fichasDisponiblesParaMover.length} ficha(s) disponible(s)`);
            }
            
            dibujarTablero();
            break;

        case 'FICHA_MOVIDA':
            if (msg.fichaEstado) {
                estadoJuego.fichas[msg.fichaEstado.id] = msg.fichaEstado;
                agregarLog(`➡️ Ficha ${msg.fichaEstado.id} movida`);
            }
            esperandoSeleccionFicha = false;
            fichasDisponiblesParaMover = [];
            dibujarTablero();
            actualizarContadorFichas();
            break;

        case 'FICHA_CAPTURADA':
            agregarLog(`💥 ${msg.fichaCapturada} capturada por ${msg.fichaCapturadora}!`);
            break;

        case 'TURNO_CAMBIADO':
            estadoJuego.turnoActual = msg.turnoActual;
            estadoJuego.contadorSeis = 0;
            fichasDisponiblesParaMover = [];
            esperandoSeleccionFicha = false;
            actualizarControlTurno();
            agregarLog(`🔄 Turno: ${estadoJuego.turnoActual}`);
            break;

        default:
            break;
    }
}


// ===== ACTUALIZAR INFO JUGADORES =====
function actualizarInfoJugadores() {
    const colores = ['ROJO', 'VERDE', 'AZUL', 'AMARILLO'];
    
    colores.forEach(color => {
        const jugador = estadoJuego.jugadores.find(j => j.color === color);
        const card = document.querySelector(`.player-${color.toLowerCase()}`);
        
        if (card && jugador) {
            const nameDiv = card.querySelector('.player-name');
            if (nameDiv) nameDiv.textContent = jugador.nombre;
            card.style.display = 'flex';
        } else if (card) {
            card.style.display = 'none';
        }
    });
    
    actualizarContadorFichas();
}

// ===== ACTUALIZAR CONTADOR FICHAS =====
function actualizarContadorFichas() {
    const colores = ['ROJO', 'VERDE', 'AZUL', 'AMARILLO'];
    
    colores.forEach(color => {
        const fichasColor = Object.values(estadoJuego.fichas).filter(f => 
            f.color === color && f.enMeta
        );
        
        const elem = document.getElementById(`fichas${color.charAt(0) + color.slice(1).toLowerCase()}`);
        if (elem) {
            elem.textContent = `${fichasColor.length}/4`;
        }
    });
}

// ===== CONTROL DE TURNO =====
function actualizarControlTurno() {
    const esMiTurno = estadoJuego.turnoActual === miColor;
    puedeTirarDado = esMiTurno;
    
    if (btnTirarDado) {
        btnTirarDado.disabled = !esMiTurno;
        btnTirarDado.style.opacity = esMiTurno ? '1' : '0.5';
    }
    
    if (valorDado) {
        if (esMiTurno) {
            valorDado.textContent = '¡Tu turno! Lanza el dado';
            valorDado.style.color = COLORES[miColor];
            valorDado.style.fontWeight = 'bold';
        } else {
            valorDado.textContent = `Turno: ${estadoJuego.turnoActual}`;
            valorDado.style.color = '#0088FF';
            valorDado.style.fontWeight = 'normal';
        }
    }
}

// ===== DADO Y FICHAS =====
function tirarDado() {
    if (!puedeTirarDado || estadoJuego.turnoActual !== miColor) return;
    
    puedeTirarDado = false;
    btnTirarDado.disabled = true;
    
    if (valorDado) valorDado.textContent = 'Tirando...';
    
    // Animación visual del dado
    let contador = 0;
    const intervalo = setInterval(() => {
        if (valorDado) valorDado.textContent = `🎲 ${Math.floor(Math.random() * 6) + 1}`;
        contador++;
        if (contador >= 10) {
            clearInterval(intervalo);
        }
    }, 100);
    
    setTimeout(() => {
        p2p.sendGameAction({ tipo: 'TIRAR_DADO' });
    }, 1000);
}

function handleClickTablero(e) {
    if (!esperandoSeleccionFicha) return;
    if (estadoJuego.turnoActual !== miColor) return;

    const rect = tableroCanvas.getBoundingClientRect();
    const scaleX = tableroCanvas.width / rect.width;
    const scaleY = tableroCanvas.height / rect.height;
    
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    for (const id of fichasDisponiblesParaMover) {
        const f = estadoJuego.fichas[id];
        if (!f) continue;

        const p = obtenerPosicionFicha(f);
        if (!p) continue;

        const dist = Math.sqrt((cx - p.x) ** 2 + (cy - p.y) ** 2);
        if (dist <= 25) {
            esperandoSeleccionFicha = false;
            fichasDisponiblesParaMover = [];

            p2p.sendGameAction({
                tipo: 'MOVER_FICHA',
                fichaId: f.numero,
                color: f.color,
                pasos: estadoJuego.ultimoDado
            });

            dibujarTablero();
            return;
        }
    }
}

// ===== TABLERO =====
function dibujarTablero() {
    if (!ctx) return;
    
    // Fondo
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(0, 0, 800, 800);
    
    // Cuadrados de esquina (casas)
    dibujarCasas();
    
    // Casillas del circuito
    dibujarCasillasCircuito();
    
    // Pasillos hacia meta
    dibujarPasillos();
    
    // Centro
    dibujarCentro();
    
    // Fichas
    dibujarTodasFichas();
}

function dibujarCasas() {
    const casas = [
        { color: 'ROJO', x: 50, y: 550, w: 200, h: 200 },
        { color: 'VERDE', x: 50, y: 50, w: 200, h: 200 },
        { color: 'AZUL', x: 550, y: 50, w: 200, h: 200 },
        { color: 'AMARILLO', x: 550, y: 550, w: 200, h: 200 }
    ];
    
    casas.forEach(casa => {
        ctx.fillStyle = COLORES[casa.color] + '44';
        ctx.fillRect(casa.x, casa.y, casa.w, casa.h);
        
        ctx.strokeStyle = COLORES_OSCUROS[casa.color];
        ctx.lineWidth = 3;
        ctx.strokeRect(casa.x, casa.y, casa.w, casa.h);
    });
}

function dibujarCasillasCircuito() {
    CASILLAS_TABLERO.forEach((cas, idx) => {
        const seguras = [0, 5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63];
        const esSegura = seguras.includes(idx);
        
        ctx.beginPath();
        ctx.arc(cas.x, cas.y, 20, 0, Math.PI * 2);
        
        if (esSegura) {
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function dibujarPasillos() {
    Object.entries(PASILLOS_META).forEach(([color, casillas]) => {
        casillas.forEach((cas, idx) => {
            ctx.beginPath();
            ctx.arc(cas.x, cas.y, 18, 0, Math.PI * 2);
            
            if (idx === 6) {
                ctx.fillStyle = COLORES[color];
                ctx.fill();
                ctx.strokeStyle = COLORES_OSCUROS[color];
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.fillStyle = COLORES[color] + '33';
                ctx.fill();
                ctx.strokeStyle = COLORES_OSCUROS[color];
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    });
}

function dibujarCentro() {
    ctx.beginPath();
    ctx.arc(400, 400, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('META', 400, 400);
}

function dibujarTodasFichas() {
    Object.values(estadoJuego.fichas).forEach(ficha => {
        if (ficha.enMeta && ficha.posicionPasillo === 6) return;
        
        const pos = obtenerPosicionFicha(ficha);
        if (!pos) return;
        
        const esSeleccionable = fichasDisponiblesParaMover.includes(ficha.id);
        
        // Sombra
        ctx.beginPath();
        ctx.arc(pos.x + 2, pos.y + 2, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        
        // Ficha
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = COLORES[ficha.color];
        ctx.fill();
        
        if (esSeleccionable) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = COLORES_OSCUROS[ficha.color];
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Número
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ficha.numero, pos.x, pos.y);
    });
}

// ===== FUNCIONES AUXILIARES =====
function obtenerPosicionFicha(f) {
    if (f.enCasa) {
        return CASAS_POSICIONES[f.color]?.[f.numero - 1];
    }
    
    if (f.enPasillo && f.posicionPasillo >= 0) {
        return PASILLOS_META[f.color]?.[f.posicionPasillo];
    }
    
    if (f.posicion >= 0 && f.posicion < CASILLAS_TABLERO.length) {
        return CASILLAS_TABLERO[f.posicion];
    }
    
    return null;
}

// ===== ARRANQUE =====
window.addEventListener('DOMContentLoaded', () => {
    initDOM();
    setupEventos();
    mostrarPantalla(pantallaSeleccion);
    console.log('🎮 Parchís P2P cargado correctamente');
});

// ===== REDIBUJADO PERIÓDICO =====
setInterval(() => {
    if (pantallaJuego && !pantallaJuego.classList.contains('hidden')) {
        dibujarTablero();
    }
}, 100);
