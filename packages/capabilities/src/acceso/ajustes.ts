import { z } from "zod";

import { defineAjustes, valoresEfectivos } from "../core/config";
import type { Contexto } from "../types";
import { TIPOS_REGISTRO } from "./comun";

// Ajustes de Control de acceso (CAR-479, R1–R2, ADR-018). Por empresa: el ámbito «instalación» del centro de
// configuración aún no existe (ADR-038). Cambiarlos es un cambio de configuración auditado por `core.config.set`
// y solo lo hace una persona (§7: con aprobación humana para agentes).
export const PERMISO_CONFIG = "acceso:config.manage";

const tipo = (nombre: string) =>
  z.boolean().default(true).meta({
    etiqueta: nombre,
    ayuda: `Apágalo si tu empresa no registra este tipo en portería: deja de ofrecerse en el teléfono.`,
    grupo: "Tipos de registro",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    soloPersonas: true,
    control: "switch",
  });

export const ajustesAcceso = z.object({
  permitir_fuera_de_lista: z.boolean().default(false).meta({
    etiqueta: "Permitir ingresos fuera de lista",
    ayuda:
      "Con una lista de autorizados cargada, por defecto solo entra quien está en ella o tiene prerregistro. Encendido, la portería puede registrar a otras personas y quedan como «fuera de lista». La lista de bloqueados se aplica siempre (R2, R7).",
    grupo: "Modo de lista",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    soloPersonas: true,
    control: "switch",
  }),
  tipo_visita: tipo("Visita"),
  tipo_contratista: tipo("Contratista"),
  tipo_proveedor: tipo("Proveedor"),
  tipo_vehiculo: tipo("Vehículo"),
  tipo_despacho: tipo("Despacho"),
});

const CAMPOS = defineAjustes("acceso", ajustesAcceso);

/** Ajustes efectivos de acceso en una sola lectura: tipos activos (R1) y si se permite entrar fuera de lista (R2). */
export async function configAcceso(ctx: Contexto) {
  const v = await valoresEfectivos(ctx, CAMPOS);
  const valor = (clave: string) => v.get(`acceso.${clave}`)?.valor === true;
  return {
    permitirFueraDeLista: valor("permitir_fuera_de_lista"),
    tipos: new Set(TIPOS_REGISTRO.filter((t) => valor(`tipo_${t}`))),
  };
}
