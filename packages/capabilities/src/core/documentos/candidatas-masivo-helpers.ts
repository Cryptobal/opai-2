import { documentoUsaVariablesSensibles, PERMISOS_CORE } from "@opai/domain";

import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { dondePersona } from "../maestros/alcance";
import { calcularRelleno } from "./rellenar-calculo";

export type FiltroCandidatas = {
  instalacionId?: string | undefined;
  cargoId?: string | undefined;
  soloVinculoVigente: boolean;
  anexoBorrador?: boolean | undefined;
  q?: string | undefined;
};

export type ItemCandidata = {
  personaId: string;
  nombre: string;
  descripcion: string;
  puedeGenerar: boolean;
  motivoBloqueo: string | null;
};

type PersonaFila = {
  id: string;
  nombres: string;
  apellidos: string;
  vinculos: {
    cargo: { nombre: string };
    instalacion: { nombre: string } | null;
  }[];
};

export function whereCandidatas(ctx: Contexto, input: FiltroCandidatas, rutNorm: string) {
  if (input.anexoBorrador && !ctx.autorizar(PERMISOS_CORE.anexosRead))
    throw prohibido("Sin permiso para filtrar por anexos de contrato.");
  return {
    AND: [
      dondePersona(ctx),
      { archivadaEn: null },
      {
        vinculos: {
          some: {
            ...(input.soloVinculoVigente ? { estado: "vigente" } : {}),
            ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
            ...(input.cargoId ? { cargoId: input.cargoId } : {}),
          },
        },
      },
      ...(input.anexoBorrador ? [{ anexos: { some: { estado: "borrador" } } }] : []),
      ...(input.q
        ? [
            {
              OR: [
                { nombres: { contains: input.q, mode: "insensitive" as const } },
                { apellidos: { contains: input.q, mode: "insensitive" as const } },
                { rut: { startsWith: rutNorm } },
              ],
            },
          ]
        : []),
    ],
  };
}

export async function itemDesdePersona(
  ctx: Contexto,
  plantillaId: string,
  contenido: string,
  p: PersonaFila,
  fecha: string,
): Promise<ItemCandidata> {
  const v = p.vinculos[0];
  const descripcion = v
    ? `${v.cargo.nombre}${v.instalacion ? ` · ${v.instalacion.nombre}` : ""}`
    : "Sin vínculo vigente";
  const conSueldo = documentoUsaVariablesSensibles(contenido);
  let puedeGenerar = false;
  let motivoBloqueo: string | null = null;
  try {
    const { faltantes } = await calcularRelleno(ctx, { plantillaId, personaId: p.id, fecha });
    if (faltantes.length) motivoBloqueo = faltantes.map((f) => f.etiqueta).join(", ");
    else if (conSueldo && !ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
      motivoBloqueo = "Necesitas lectura sensible de sueldos.";
    else puedeGenerar = true;
  } catch (e) {
    motivoBloqueo = e instanceof Error ? e.message : "No se pudo preparar el documento.";
  }
  return {
    personaId: p.id,
    nombre: `${p.nombres} ${p.apellidos}`.trim(),
    descripcion,
    puedeGenerar,
    motivoBloqueo,
  };
}