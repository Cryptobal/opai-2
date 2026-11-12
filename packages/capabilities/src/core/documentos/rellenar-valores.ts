// Valores de las variables de una plantilla laboral para una persona (CAR-127, PR 4a). Todo sale de la
// ficha dentro del alcance del actor; el sueldo reutiliza la resolución de `core.estructuras.efectiva`
// (capas persona → puesto → instalación, con su auditoría de lectura sensible). Lo que no se pueda
// resolver no se inventa: queda sin valor y con su motivo.
import { formatearRut, PERMISOS_CORE, pesosDeDocumento, fechaDeDocumento } from "@opai/domain";

import type { Contexto } from "../../types";
import { ajuste } from "../config/valores";
import { dia } from "../maestros/comun";
import { estructurasEfectiva } from "../maestros/estructuras-efectiva";

type Persona = { id: string; nombres: string; apellidos: string; rut: string; calle: string | null; comuna: string | null };
const unir = (...partes: (string | null | undefined)[]) => partes.map((p) => p?.trim()).filter(Boolean).join(", ") || null;

export async function valoresDePersona(ctx: Contexto, persona: Persona, fecha: string, claves: readonly string[], conSueldo: boolean) {
  const motivos: Record<string, string> = {};
  const valores: Record<string, string | null> = {
    "persona.nombre": `${persona.nombres} ${persona.apellidos}`.trim(),
    "persona.rut": formatearRut(persona.rut),
    "persona.direccion": unir(persona.calle, persona.comuna),
  };
  if (!valores["persona.direccion"]) motivos["persona.direccion"] = "Falta la dirección de la persona. Complétala en su ficha.";
  const usa = (grupo: string) => claves.some((c) => c.startsWith(`${grupo}.`));
  if (usa("vinculo") || usa("instalacion") || valores["persona.comuna_laboral"] === undefined) {
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: persona.id, estado: "vigente" },
      include: { cargo: { select: { nombre: true } }, instalacion: { select: { nombre: true, calle: true, comuna: true } } },
    });
    const sinVinculo = "La persona no tiene un contrato vigente.";
    valores["vinculo.cargo"] = v?.cargo.nombre ?? null;
    valores["vinculo.inicio"] = v ? fechaDeDocumento(dia(v.inicio) ?? "") : null;
    valores["vinculo.jornada"] = v?.horasSemanales && v.distribucion ? `${v.horasSemanales} horas semanales, ${v.distribucion}` : null;
    valores["instalacion.nombre"] = v?.instalacion?.nombre ?? null;
    valores["instalacion.direccion"] = unir(v?.instalacion?.calle, v?.instalacion?.comuna);
    valores["persona.comuna_laboral"] = v?.instalacion?.comuna ?? null;
    for (const k of ["vinculo.cargo", "vinculo.inicio", "vinculo.jornada", "instalacion.nombre", "instalacion.direccion", "persona.comuna_laboral"])
      if (!valores[k]) motivos[k] = v ? "Falta el dato en el contrato o en la instalación." : sinVinculo;
  }
  if (conSueldo) await sueldo(ctx, persona.id, fecha, valores, motivos);
  return { valores, motivos };
}

async function sueldo(ctx: Contexto, personaId: string, fecha: string, valores: Record<string, string | null>, motivos: Record<string, string>) {
  const claves = ["sueldo.base", "sueldo.gratificacion"];
  if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) {
    for (const k of claves) motivos[k] = "Necesitas permiso de lectura sensible de sueldos.";
    return;
  }
  const imm = await ajuste<number>(ctx, "core", "remuneraciones_imm");
  const r = await estructurasEfectiva.handler(ctx, { personaId, fecha, imm }, { dryRun: false });
  const base = r.estructura?.sueldoBase ?? null;
  const grat = r.haberes?.["gratificacion"];
  valores["sueldo.base"] = base === null ? null : pesosDeDocumento(base);
  valores["sueldo.gratificacion"] = typeof grat === "number" ? pesosDeDocumento(grat) : null;
  for (const k of claves)
    if (!valores[k]) motivos[k] = r.estado === "sin_capa" ? "La persona no tiene una estructura de sueldo vigente." : "La estructura de sueldo está incompleta.";
}
