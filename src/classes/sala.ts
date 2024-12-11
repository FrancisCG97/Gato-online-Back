import { Socket } from "socket.io";
import { CrearSalaArgs } from "../interfaces/crearSala";
import { Jugador, JUGADOR_VACIO } from "../interfaces/jugador";
import {
  EstadoJuego,
  POSICION_TABLERO,
  PosicionGanadora,
  SalaBackend,
  Tablero,
} from "../interfaces/sala";

export class Sala {
  publica: boolean;
  jugadores: [Jugador, Jugador] = [{ ...JUGADOR_VACIO }, { ...JUGADOR_VACIO }];
  id: number;
  socket: Socket;
  jugadorInicial: 0 | 1 = 0;
  tablero: Tablero = ["", "", "", "", "", "", "", "", ""];
  estado: EstadoJuego = "ESPERANDO_COMPAÑERO";
  posicionGanadora?: PosicionGanadora;

  constructor(args: CrearSalaArgs, socket: Socket) {
    this.publica = args.publica;
    this.socket = socket;
  }

  agregarJugador(nombre: string) {
    const indiceJugador = !this.jugadores[0].nombre ? 0 : 1;
    this.jugadores[indiceJugador].nombre = nombre;
    this.jugadores[indiceJugador].vidas = 3;
    if (this.jugadores[1].nombre) {
      this.estado = this.jugadorInicial === 0 ? "TURNO_P1" : "TURNO_P2";
    }
    this.comunicarSala();
  }

  getSala(): SalaBackend {
    return {
      publica: this.publica,
      jugadores: this.jugadores,
      id: this.id,
      estado: this.estado,
      tablero: this.tablero,
      posicionGanadora: this.posicionGanadora,
    };
  }

  // Comunica el estado actual de la sala a todos sus integrantes
  comunicarSala() {
    global.io.to("Sala-" + this.id).emit("sala", this.getSala());
  }

  // Cambiar el estado de la sala a abandonado
  jugadorAbandono() {
    this.estado = "ABANDONADO";
    this.comunicarSala();
  }

  jugar(numeroJugador: 1 | 2, posicion: POSICION_TABLERO) {
    if (
      (numeroJugador !== 1 && this.estado === "TURNO_P1") ||
      (numeroJugador !== 2 && this.estado === "TURNO_P2")
    )
      return;
    this.tablero[posicion] = numeroJugador;
    this.posicionGanadora = undefined;

    // Asignación de turnos
    this.estado = this.estado === "TURNO_P1" ? "TURNO_P2" : "TURNO_P1";

    // Verificación de victoria o empate de jugadores
    const fin = this.verificarVictoria();
    if (fin === "EMPATE") {
      this.estado = "EMPATE";
    } else if (typeof fin === "object") {
      const indiceJugadorAfectado = numeroJugador === 1 ? 1 : 0;
      this.jugadores[indiceJugadorAfectado].vidas--;
      if (this.jugadores[indiceJugadorAfectado].vidas === 0) {
        this.estado =
          numeroJugador === 1 ? "VICTORIA_FINAL_P1" : "VICTORIA_FINAL_P2";
          this.posicionGanadora = fin;
      } else {
        this.estado = numeroJugador === 1 ? "VICTORIA_P1" : "VICTORIA_P2";
        this.posicionGanadora = fin;
      }
    }

    // Comunicación de sala
    this.comunicarSala();
  }

  verificarVictoria(): PosicionGanadora | "EMPATE" | undefined {
    // Verificar líneas horizontales
    for (let i = 0; i < 3; i += 3) {
      if (
        this.tablero[i] !== "" &&
        this.tablero[i] === this.tablero[i + 1] &&
        this.tablero[i] === this.tablero[i + 2]
      )
        return [i as POSICION_TABLERO, i + 1 as POSICION_TABLERO, i + 2 as POSICION_TABLERO];
    }

    // Verificar líneas verticales
    for (let i = 0; i < 3; i++) {
      if (
        this.tablero[i] !== "" &&
        this.tablero[i] === this.tablero[i + 3] &&
        this.tablero[i] === this.tablero[i + 6]
      )
        return [i as POSICION_TABLERO, i + 3 as POSICION_TABLERO, i + 6 as POSICION_TABLERO];
    }

    // Verificar líneas diagonales
    if (
      this.tablero[0] !== "" &&
      this.tablero[0] === this.tablero[4] &&
      this.tablero[0] === this.tablero[8]
    ) {
      return [0, 4, 8];
    }

    // Verificar líneas diagonales
    if (
      this.tablero[2] !== "" &&
      this.tablero[2] === this.tablero[4] &&
      this.tablero[2] === this.tablero[6]
    ) {
      return [2, 4, 6];
    }

    // Verifico empate
    if (!this.tablero.includes("")) return "EMPATE";

    return undefined;
  }

  nuevaRonda() {
    this.vaciarTablero();
    this.cambiarJugadorInicial();
    this.posicionGanadora = undefined;
    this.estado = this.jugadorInicial === 0 ? "TURNO_P1" : "TURNO_P2";
    if (this.jugadores[0].vidas === 0 || this.jugadores[1].vidas === 0) {
      this.jugadores[0].vidas = 3;
      this.jugadores[1].vidas = 3;
    }
    this.comunicarSala();
  }

  vaciarTablero() {
    this.tablero = ["", "", "", "", "", "", "", "", ""];
  }

  cambiarJugadorInicial() {
    this.jugadorInicial = this.jugadorInicial === 0 ? 1 : 0;
  }

}
