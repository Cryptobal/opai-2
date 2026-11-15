// Implementación real de `ctx.identidad` (CAR-43): operaciones con nombre de @opai/db, con el rol
// `opai_auth` para las tablas de credenciales.
import {
  appsConectadas,
  borrarUsuario,
  consumirReautenticacion,
  desactivarTotp,
  desconectarApp,
  metodosDeUsuario,
  quitarPasskey,
  renombrarPasskey,
  restablecerSegundoFactor,
  ultimosAccesos,
  usuarioEnOtrasEmpresas,
} from "@opai/db";

import type { Identidad } from "./types";

export const identidadEnDb: Identidad = {
  ultimosAccesos,
  enOtrasEmpresas: usuarioEnOtrasEmpresas,
  restablecerSegundoFactor,
  borrarUsuario,
  metodosDe: metodosDeUsuario,
  renombrarPasskey,
  quitarPasskey,
  desactivarTotp,
  consumirReautenticacion,
  appsConectadas,
  desconectarApp,
};
