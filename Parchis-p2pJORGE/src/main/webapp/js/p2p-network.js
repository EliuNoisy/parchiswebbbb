// ============================================
// RED P2P CON PEERJS - SISTEMA COMPLETO
// ============================================

class P2PNetwork {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> DataConnection
        this.roomCode = null;
        this.isHost = false;
        this.myPeerId = null;
        this.myPlayer = null;
        
        this.gameState = {
            jugadores: [],
            fichas: {},
            turnoActual: null,
            ultimoDado: 0,
            contadorSeis: 0,
            partidaIniciada: false
        };

        // Callbacks
        this.onLobbyUpdate = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameMessage = null;
        this.onError = null;

        this.coloresDisponibles = ['ROJO', 'AZUL', 'VERDE', 'AMARILLO'];
    }

    // ===== CREAR SALA (HOST) =====
    async createRoom(playerData) {
        return new Promise((resolve, reject) => {
            this.peer = new Peer({
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.myPeerId = id;
                this.roomCode = id;
                this.isHost = true;

                const color = this.coloresDisponibles.shift();
                this.myPlayer = {
                    peerId: id,
                    nombre: playerData.nombre,
                    avatar: playerData.avatar,
                    color: color,
                    esHost: true
                };

                this.gameState.jugadores.push(this.myPlayer);
                this.inicializarFichas();

                this.peer.on('connection', (conn) => this.handleNewConnection(conn));

                resolve({
                    roomCode: this.roomCode,
                    player: this.myPlayer
                });
            });

            this.peer.on('error', (err) => {
                console.error('❌ Error PeerJS:', err);
                if (this.onError) this.onError(err.message);
                reject(err);
            });
        });
    }

    // ===== UNIRSE A SALA (CLIENT) =====
    async joinRoom(roomCode, playerData) {
        return new Promise((resolve, reject) => {
            this.peer = new Peer({
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.myPeerId = id;
                this.roomCode = roomCode;
                this.isHost = false;

                const conn = this.peer.connect(roomCode, {
                    reliable: true,
                    serialization: 'json'
                });

                conn.on('open', () => {
                    conn.send({
                        tipo: 'UNIRSE',
                        playerData: {
                            peerId: id,
                            nombre: playerData.nombre,
                            avatar: playerData.avatar
                        }
                    });
                });

                conn.on('data', (data) => {
                    if (data.tipo === 'BIENVENIDO') {
                        this.myPlayer = data.player;
                        this.gameState = data.gameState;
                        this.connections.set(roomCode, conn);
                        
                        if (this.onLobbyUpdate) {
                            this.onLobbyUpdate(this.gameState.jugadores);
                        }

                        resolve({
                            roomCode: this.roomCode,
                            player: this.myPlayer
                        });
                    } else if (data.tipo === 'ERROR') {
                        reject(new Error(data.mensaje));
                    } else {
                        this.handleGameMessage(data);
                    }
                });

                conn.on('close', () => {
                    this.connections.delete(roomCode);
                    if (this.onError) this.onError('Desconectado del host');
                });

                conn.on('error', (err) => {
                    console.error('❌ Error conexión:', err);
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('❌ Error PeerJS:', err);
                reject(err);
            });
        });
    }

    // ===== MANEJAR NUEVA CONEXIÓN (HOST) =====
    handleNewConnection(conn) {
        console.log(`✅ Nueva conexión de: ${conn.peer}`);

        conn.on('data', (data) => {
            if (data.tipo === 'UNIRSE') {
                if (this.gameState.partidaIniciada) {
                    conn.send({ tipo: 'ERROR', mensaje: 'Partida ya iniciada' });
                    conn.close();
                    return;
                }

                if (this.gameState.jugadores.length >= 4) {
                    conn.send({ tipo: 'ERROR', mensaje: 'Sala llena' });
                    conn.close();
                    return;
                }

                const color = this.coloresDisponibles.shift();
                const nuevoJugador = {
                    ...data.playerData,
                    color: color,
                    esHost: false
                };

                this.gameState.jugadores.push(nuevoJugador);
                this.connections.set(conn.peer, conn);

                conn.send({
                    tipo: 'BIENVENIDO',
                    player: nuevoJugador,
                    gameState: this.gameState
                });

                this.broadcastToAll({
                    tipo: 'ACTUALIZAR_LOBBY',
                    jugadores: this.gameState.jugadores
                });

                if (this.onPlayerJoined) this.onPlayerJoined(nuevoJugador);
                if (this.onLobbyUpdate) this.onLobbyUpdate(this.gameState.jugadores);
            } else {
                this.handleGameMessage(data, conn.peer);
            }
        });

        conn.on('close', () => {
            const jugador = this.gameState.jugadores.find(j => j.peerId === conn.peer);
            if (jugador) {
                this.coloresDisponibles.push(jugador.color);
                this.gameState.jugadores = this.gameState.jugadores.filter(j => j.peerId !== conn.peer);
                
                this.broadcastToAll({
                    tipo: 'ACTUALIZAR_LOBBY',
                    jugadores: this.gameState.jugadores
                });

                if (this.onPlayerLeft) this.onPlayerLeft(jugador);
                if (this.onLobbyUpdate) this.onLobbyUpdate(this.gameState.jugadores);
            }
            this.connections.delete(conn.peer);
        });
    }

    // ===== INICIALIZAR FICHAS =====
    inicializarFichas() {
        const colores = ['ROJO', 'AZUL', 'VERDE', 'AMARILLO'];
        colores.forEach(color => {
            for (let i = 1; i <= 4; i++) {
                const id = `${color}-${i}`;
                this.gameState.fichas[id] = {
                    id: id,
                    color: color,
                    numero: i,
                    enCasa: true,
                    posicion: -1,
                    enPasillo: false,
                    posicionPasillo: -1,
                    enMeta: false
                };
            }
        });
    }

    // ===== INICIAR PARTIDA (SOLO HOST) =====
    iniciarPartida() {
        if (!this.isHost) return;
        if (this.gameState.jugadores.length < 2) return;

        this.gameState.partidaIniciada = true;
        this.gameState.turnoActual = this.gameState.jugadores[0].color;

        this.broadcastToAll({
            tipo: 'PARTIDA_INICIADA',
            gameState: this.gameState
        });

        if (this.onGameMessage) {
            this.onGameMessage({ tipo: 'PARTIDA_INICIADA', gameState: this.gameState });
        }
    }

    // ===== ENVIAR ACCIÓN DE JUEGO =====
    sendGameAction(action) {
        if (this.isHost) {
            this.procesarAccion(action);
        } else {
            const hostConn = this.connections.get(this.roomCode);
            if (hostConn) hostConn.send(action);
        }
    }

    // ===== PROCESAR ACCIÓN (HOST) =====
    procesarAccion(action) {
        if (!this.isHost) return;

        switch (action.tipo) {
            case 'TIRAR_DADO':
                this.procesarTirarDado();
                break;

            case 'MOVER_FICHA':
                this.procesarMoverFicha(action);
                break;
        }
    }

    // ===== TIRAR DADO =====
procesarTirarDado() {
    const valor = Math.floor(Math.random() * 6) + 1;
    this.gameState.ultimoDado = valor;

    if (valor === 6) {
        this.gameState.contadorSeis++;
    } else {
        this.gameState.contadorSeis = 0;
    }

    this.broadcastToAll({
        tipo: 'DADO_TIRADO',
        valor: valor,
        contadorSeis: this.gameState.contadorSeis
    });

    // Verificar fichas disponibles
    setTimeout(() => {
        const fichasDisponibles = this.obtenerFichasDisponibles(
            this.gameState.turnoActual,
            valor
        );

        if (fichasDisponibles.length === 0) {
            // Sin movimientos válidos
            this.broadcastToAll({
                tipo: 'SIN_MOVIMIENTOS',
                mensaje: 'No hay movimientos válidos'
            });

            // ⚠️ CAMBIO IMPORTANTE: Solo cambiar turno si NO es 6 o si ya sacó 3 seises
            setTimeout(() => {
                if (valor !== 6 || this.gameState.contadorSeis >= 3) {
                    this.cambiarTurno();
                } else {
                    // Es 6 pero sin movimientos, PUEDE tirar de nuevo
                    this.broadcastToAll({
                        tipo: 'PUEDE_TIRAR_OTRA_VEZ',
                        mensaje: 'Sacaste 6, puedes tirar de nuevo'
                    });
                }
            }, 500);
        } else {
            this.broadcastToAll({
                tipo: 'FICHAS_DISPONIBLES',
                fichas: fichasDisponibles
            });
        }
    }, 1000);
}


    // ===== OBTENER FICHAS DISPONIBLES =====
    obtenerFichasDisponibles(color, valorDado) {
        const fichas = Object.values(this.gameState.fichas).filter(f => 
            f.color === color && !f.enMeta
        );

        const disponibles = [];

        for (const ficha of fichas) {
            if (ficha.enCasa) {
                if (valorDado === 5) disponibles.push(ficha.id);
            } else if (!ficha.enPasillo) {
                // Verificar si puede avanzar
                const nuevaPos = (ficha.posicion + valorDado) % 68;
                
                // Verificar entrada al pasillo
                const casillaInicioPasillo = this.getCasillaInicioPasillo(color);
                if (this.pasaPorInicioPasillo(ficha.posicion, nuevaPos, casillaInicioPasillo)) {
                    const pasosDespues = this.calcularPasosDespuesPasillo(ficha.posicion, valorDado, casillaInicioPasillo);
                    if (pasosDespues <= 7) {
                        disponibles.push(ficha.id);
                    }
                } else {
                    disponibles.push(ficha.id);
                }
            } else if (ficha.enPasillo) {
                if (ficha.posicionPasillo + valorDado <= 6) {
                    disponibles.push(ficha.id);
                }
            }
        }

        return disponibles;
    }

    // ===== MOVER FICHA =====
    procesarMoverFicha(action) {
    const ficha = this.gameState.fichas[`${action.color}-${action.fichaId}`];
    if (!ficha) return;

    if (ficha.enCasa) {
        ficha.enCasa = false;
        ficha.posicion = this.getCasillaSalida(action.color);
    } else if (ficha.enPasillo) {
        ficha.posicionPasillo += action.pasos;
        if (ficha.posicionPasillo >= 6) {
            ficha.enMeta = true;
            ficha.posicionPasillo = 6;
        }
    } else {
        const nuevaPos = (ficha.posicion + action.pasos) % 68;
        const inicioPasillo = this.getCasillaInicioPasillo(action.color);

        if (this.pasaPorInicioPasillo(ficha.posicion, nuevaPos, inicioPasillo)) {
            ficha.enPasillo = true;
            const pasosDespues = this.calcularPasosDespuesPasillo(ficha.posicion, action.pasos, inicioPasillo);
            ficha.posicionPasillo = pasosDespues;
            ficha.posicion = -1;
        } else {
            ficha.posicion = nuevaPos;
            this.verificarCaptura(ficha);
        }
    }

    this.broadcastToAll({
        tipo: 'FICHA_MOVIDA',
        fichaEstado: ficha
    });

    // ⚠️ CAMBIO: Cambiar turno solo si NO es 6 o si ya sacó 3 seises
    setTimeout(() => {
        if (this.gameState.ultimoDado !== 6 || this.gameState.contadorSeis >= 3) {
            this.cambiarTurno();
        } else {
            // Sacó 6, puede tirar otra vez
            this.broadcastToAll({
                tipo: 'PUEDE_TIRAR_OTRA_VEZ',
                mensaje: 'Moviste y sacaste 6, tira de nuevo'
            });
        }
    }, 500);
}
    // ===== VERIFICAR CAPTURA =====
    verificarCaptura(fichaMovida) {
        const fichasEnPosicion = Object.values(this.gameState.fichas).filter(f =>
            f.id !== fichaMovida.id &&
            !f.enCasa &&
            !f.enPasillo &&
            !f.enMeta &&
            f.posicion === fichaMovida.posicion
        );

        if (fichasEnPosicion.length > 0 && !this.esCasillaSegura(fichaMovida.posicion)) {
            fichasEnPosicion.forEach(f => {
                if (f.color !== fichaMovida.color) {
                    f.enCasa = true;
                    f.posicion = -1;
                    this.broadcastToAll({
                        tipo: 'FICHA_CAPTURADA',
                        fichaCapturada: f.id,
                        fichaCapturadora: fichaMovida.id
                    });
                }
            });
        }
    }

    // ===== CAMBIAR TURNO =====
    cambiarTurno() {
        const coloresEnJuego = this.gameState.jugadores.map(j => j.color);
        const indiceActual = coloresEnJuego.indexOf(this.gameState.turnoActual);
        const siguienteIndice = (indiceActual + 1) % coloresEnJuego.length;
        
        this.gameState.turnoActual = coloresEnJuego[siguienteIndice];
        this.gameState.contadorSeis = 0;

        this.broadcastToAll({
            tipo: 'TURNO_CAMBIADO',
            turnoActual: this.gameState.turnoActual
        });
    }

    // ===== UTILIDADES =====
    getCasillaSalida(color) {
        const salidas = { ROJO: 0, VERDE: 17, AZUL: 34, AMARILLO: 51 };
        return salidas[color] || 0;
    }

    getCasillaInicioPasillo(color) {
        const inicios = { ROJO: 63, VERDE: 12, AZUL: 29, AMARILLO: 46 };
        return inicios[color] || 0;
    }

    pasaPorInicioPasillo(posActual, posNueva, inicioPasillo) {
        if (posActual < inicioPasillo && posNueva >= inicioPasillo) return true;
        if (posActual < inicioPasillo && posNueva < posActual) return true;
        return false;
    }

    calcularPasosDespuesPasillo(posActual, pasos, inicioPasillo) {
        const distancia = (inicioPasillo - posActual + 68) % 68;
        return pasos - distancia;
    }

    esCasillaSegura(pos) {
        const seguras = [0, 5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63];
        return seguras.includes(pos);
    }

    // ===== BROADCAST =====
    broadcastToAll(message) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(message);
        });

        if (this.onGameMessage) {
            this.onGameMessage(message);
        }
    }

    handleGameMessage(data, senderId) {
        if (this.isHost) {
            this.procesarAccion(data);
        } else {
            if (this.onGameMessage) {
                this.onGameMessage(data);
            }
        }
    }

    // ===== OBTENER MI COLOR =====
    getMyColor() {
        return this.myPlayer ? this.myPlayer.color : null;
    }

    // ===== DESCONECTAR =====
    disconnect() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        if (this.peer) this.peer.destroy();
    }
}
