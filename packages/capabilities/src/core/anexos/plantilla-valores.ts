import { formatearRut, fechaDeDocumento } from "@opai/domain";

import type { Contexto } from "../../types";
import { dia } from "../maestros/comun";
import type { FilaAnexoDoc } from "./plantilla";
import { CLAUSULA_MATERIA_ANEXO } from "./plantilla";

const PAIS: Record<string, string> = {
  CL: "chilena",
  PE: "peruana",
  VE: "venezolana",
  CO: "colombiana",
  AR: "argentina",
  BO: "boliviana",
};

const CLAUSULA_NUMERO: Record<string, string> = {
  capa: "tercera",
  monto: "tercera",
  instalacion: "cuarta",
  rol: "quinta",
};

const unir = (...partes: (string | null | undefined)[]) =>
  partes
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ") || null;

function textoClausulaNueva(filas: readonly FilaAnexoDoc[]): string {
  if (!filas.length) return "—";
  return filas.map((f) => `${f.concepto}: ${f.antes} → ${f.despues}`).join("; ");
}

/** Valores para los marcadores `{{campo}}` del texto legal base del anexo (CAR-58). */
export async function valoresLegalesAnexo(
  ctx: Contexto,
  persona: {
    nombres: string;
    apellidos: string;
    rut: string;
    calle: string | null;
    comuna: string | null;
    nacionalidad: string;
  },
  anexo: { motivoCambio: string; vinculoId: string },
  filas: readonly FilaAnexoDoc[],
  fecha: string,
) {
  const [perfil, vinculo] = await Promise.all([
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ctx.db.vinculoLaboral.findUnique({
      where: { id: anexo.vinculoId },
      include: { cargo: { select: { nombre: true } }, instalacion: { select: { comuna: true } } },
    }),
  ]);
  const motivo = anexo.motivoCambio;
  const valores: Record<string, string | null> = {
    ciudad_firma: perfil?.comuna ?? vinculo?.instalacion?.comuna ?? null,
    fecha_anexo: fechaDeDocumento(fecha),
    empresa_razon_social: perfil?.razonSocial ?? null,
    empresa_rut: perfil?.rut ? formatearRut(perfil.rut) : null,
    representante_nombre: perfil?.representanteNombre ?? null,
    representante_rut: perfil?.representanteRut ? formatearRut(perfil.representanteRut) : null,
    empresa_domicilio: unir(perfil?.calle, perfil?.comuna),
    trabajador_nombre: `${persona.nombres} ${persona.apellidos}`.trim(),
    trabajador_rut: formatearRut(persona.rut),
    trabajador_nacionalidad: PAIS[persona.nacionalidad] ?? persona.nacionalidad,
    trabajador_domicilio: unir(persona.calle, persona.comuna),
    fecha_contrato_original: vinculo ? fechaDeDocumento(dia(vinculo.inicio) ?? "") : null,
    cargo_actual: vinculo?.cargo.nombre ?? null,
    clausula_numero: CLAUSULA_NUMERO[motivo] ?? null,
    clausula_materia: CLAUSULA_MATERIA_ANEXO[motivo] ?? motivo,
    clausula_texto_nuevo: textoClausulaNueva(filas),
    fecha_vigencia: fechaDeDocumento(fecha),
    fecha_termino: vinculo?.termino ? fechaDeDocumento(dia(vinculo.termino) ?? "") : null,
  };
  const faltantes = Object.entries(valores)
    .filter(([k, v]) => k !== "fecha_termino" && !v?.trim())
    .map(([k]) => k);
  return { valores, faltantes };
}