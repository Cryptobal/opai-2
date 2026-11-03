import { formatearClp } from "@opai/domain";

import type { Contexto } from "../../types";
import { capaQueRige, diaAnterior } from "./capa-documento";
import type { FilaAnexoDoc } from "./plantilla";
import type { FilaAnexo } from "./vista";

async function estructuraDoc(ctx: Contexto, id: unknown) {
  if (typeof id !== "string") return null;
  return ctx.db.estructuraSueldo.findUnique({ where: { id } });
}

const CONCEPTOS = [
  { campo: "sueldoBase", etiqueta: "Sueldo base" },
  { campo: "colacion", etiqueta: "Colación" },
  { campo: "movilizacion", etiqueta: "Movilización" },
  { campo: "gratificacionMonto", etiqueta: "Gratificación" },
] as const;

const monto = (n: number | null | undefined) => (n == null ? "—" : formatearClp(n));

/**
 * Filas antes/después del documento final (R15): montos reales de la estructura referenciada por el
 * borrador para capa/monto; nombres de instalación y puesto para el cambio de instalación. El
 * cambio de rol de turno no tiene fuente hoy (Operaciones es fase 3, §16.c-3 del brief): sin filas.
 */
export async function filasParaDocumento(
  ctx: Contexto,
  anexo: Pick<
    FilaAnexo,
    "personaId" | "vinculoId" | "motivoCambio" | "snapshotAntes" | "snapshotDespues" | "createdAt"
  >,
): Promise<FilaAnexoDoc[]> {
  const despues = (anexo.snapshotDespues ?? {}) as Record<string, unknown>;
  const antes = (anexo.snapshotAntes ?? {}) as Record<string, unknown>;
  if (anexo.motivoCambio === "capa" || anexo.motivoCambio === "monto") {
    const [refDespues, refAntes] = await Promise.all([
      estructuraDoc(ctx, despues["estructuraId"]),
      estructuraDoc(ctx, antes["estructuraId"]),
    ]);
    // Una capa nueva sin versión previa no trae «antes» y una anulación no trae «después»: se
    // completan con la capa que rige a la persona, para no imprimir un documento todo en «—».
    const eAntes =
      refAntes ??
      (refDespues
        ? await capaQueRige(ctx, anexo, diaAnterior(refDespues.vigenteDesde), refDespues.id)
        : null);
    // Anulación: rige la capa que queda en la fecha de la versión anulada (o al generar el anexo).
    const eDespues =
      refDespues ??
      (await capaQueRige(
        ctx,
        anexo,
        refAntes?.vigenteDesde ?? anexo.createdAt,
        refAntes?.id ?? null,
      ));
    return CONCEPTOS.map(({ campo, etiqueta }) => ({
      concepto: etiqueta,
      antes: monto(eAntes?.[campo] as number | null | undefined),
      despues: monto(eDespues?.[campo] as number | null | undefined),
    })).filter((f) => f.antes !== "—" || f.despues !== "—");
  }
  if (anexo.motivoCambio === "instalacion") {
    const idsInstalacion = [antes["instalacionId"], despues["instalacionId"]].filter(
      (v): v is string => typeof v === "string",
    );
    const idsPuesto = [antes["puestoId"], despues["puestoId"]].filter(
      (v): v is string => typeof v === "string",
    );
    const [instalaciones, puestos] = await Promise.all([
      idsInstalacion.length
        ? ctx.db.instalacion.findMany({ where: { id: { in: idsInstalacion } } })
        : [],
      idsPuesto.length ? ctx.db.puesto.findMany({ where: { id: { in: idsPuesto } } }) : [],
    ]);
    const nombreInstalacion = (id: unknown) =>
      instalaciones.find((i) => i.id === id)?.nombre ?? "—";
    const nombrePuesto = (id: unknown) => puestos.find((p) => p.id === id)?.nombre ?? "—";
    const filas = [
      {
        concepto: "Instalación",
        antes: nombreInstalacion(antes["instalacionId"]),
        despues: nombreInstalacion(despues["instalacionId"]),
      },
      {
        concepto: "Puesto",
        antes: nombrePuesto(antes["puestoId"]),
        despues: nombrePuesto(despues["puestoId"]),
      },
    ];
    return filas.filter((f) => f.antes !== "—" || f.despues !== "—");
  }
  return [];
}
