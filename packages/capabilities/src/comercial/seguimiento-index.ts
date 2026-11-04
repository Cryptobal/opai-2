// Capacidades del seguimiento comercial automático (CAR-67).
import type { Capacidad } from "../types";
import { seguimientosControlar, seguimientosRegistrarRespuesta } from "./seguimientos-control";
import { seguimientosCorreos } from "./seguimientos-correos";
import { seguimientosRecibirCorreo } from "./seguimientos-entrante";
import { seguimientosIniciar } from "./seguimientos-iniciar";
import { seguimientosGet, seguimientosList } from "./seguimientos-lectura";
import { seguimientosEnviarPaso, seguimientosRegistrarPaso } from "./seguimientos-pasos";
import { seguimientoPlanesCrearBase, seguimientoPlanesGuardar, seguimientoPlanesList } from "./seguimiento-planes";

export const capacidadesSeguimiento: readonly Capacidad[] = [
  seguimientoPlanesList, seguimientoPlanesGuardar, seguimientoPlanesCrearBase,
  seguimientosList, seguimientosGet, seguimientosCorreos, seguimientosIniciar, seguimientosControlar,
  seguimientosRegistrarRespuesta, seguimientosRegistrarPaso, seguimientosEnviarPaso, seguimientosRecibirCorreo,
];
