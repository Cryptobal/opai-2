import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import { dondePersona } from "../maestros/alcance";

type Item = {
  tipo: "anexos";
  titulo: string;
  detalle: string;
  tono: "warning";
  href: string;
  accion: string;
};

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * «Anexos de contrato en borrador» del Inicio (CAR-210). «Revisar» abre el anexo concreto donde se
 * decide —el más antiguo— y no la lista de Personas, que en la vista dividida queda en «Elige una
 * persona». Exige gestionar y leer anexos, y el alcance de personas se aplica en la misma consulta
 * del conteo y del enlace (ADR-022): nunca se enlaza a un anexo que el actor no pueda abrir. Solo
 * cuenta estados y ids: sin motivos, montos ni datos personales.
 */
export async function pendientesAnexos(ctx: Contexto): Promise<Item[]> {
  if (!ctx.autorizar(PERMISOS_CORE.anexosManage) || !ctx.autorizar(PERMISOS_CORE.anexosRead))
    return [];
  const where = { estado: "borrador", persona: dondePersona(ctx) };
  const [n, primero] = await Promise.all([
    ctx.db.anexoContrato.count({ where }),
    ctx.db.anexoContrato.findFirst({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, personaId: true },
    }),
  ]);
  if (!n || !primero) return [];
  return [
    {
      tipo: "anexos",
      titulo: `${plural(n, "anexo de contrato", "anexos de contrato")} en borrador`,
      detalle:
        n === 1
          ? "Revisa el cambio y apruébalo o recházalo con motivo"
          : "Abre el más antiguo; el resto sigue en Personas › Anexos en borrador",
      tono: "warning",
      href: `/personas/${primero.personaId}/anexos/${primero.id}`,
      accion: "Revisar",
    },
  ];
}
