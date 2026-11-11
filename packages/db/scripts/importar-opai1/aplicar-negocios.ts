// Carga de negocios de OPAI 1 (CAR-279). Es carga histórica: el negocio entra directo en la etapa
// equivalente, sin disparar los efectos de «ganar» ni exigir fecha o motivo de cierre (decisión de
// Carlos, 11-nov-2026). El estado lo deriva el trigger de la base desde el tipo de la etapa.
import type { TenantTx } from "../../src/transaccion";
import type { Decision } from "./comun";
import type { DatosNegocio } from "./negocios-plan";
import type { Registro } from "./registro";

type Anotar = (idOpai1: string, entidadId: string, metodo: "creado" | "sinCambio") => Promise<void>;

const fecha = (v: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Cuenta de 2.0 del negocio: la ya existente o la creada en esta misma corrida. */
function cuentaDe(cuentas: ReadonlyMap<string, string>, clave: string): string | null {
  return clave.startsWith("nueva:") ? (cuentas.get(clave.slice(6)) ?? null) : clave;
}

export async function aplicarNegocios(
  tx: TenantTx,
  tenantId: string,
  decisiones: readonly Decision<DatosNegocio>[],
  cuentas: ReadonlyMap<string, string>,
  reg: Registro,
  anotar: Anotar,
): Promise<{ creados: number; omitidos: number }> {
  const porCrear = decisiones.filter((d) => d.accion === "crear" && d.datos);
  const etapaIds = [...new Set(porCrear.flatMap((d) => (d.datos ? [d.datos.etapaId] : [])))];
  const etapas = etapaIds.length
    ? await tx.etapa.findMany({ where: { id: { in: etapaIds } }, select: { id: true, embudoId: true } })
    : [];
  const embudoDe = new Map(etapas.map((e) => [e.id, e.embudoId]));
  let creados = 0;
  let omitidos = 0;
  const omitir = async (id: string, motivo: string) => {
    await reg.omitido("negocio", id, motivo);
    omitidos += 1;
  };
  for (const d of decisiones) {
    if (d.accion === "sin_cambios" && d.destinoId) {
      await anotar(d.idOpai1, d.destinoId, "sinCambio");
      continue;
    }
    if (d.accion !== "crear" || !d.datos) {
      await omitir(d.idOpai1, d.motivo ?? d.accion);
      continue;
    }
    const cuentaId = cuentaDe(cuentas, d.datos.cuentaId);
    const embudoId = embudoDe.get(d.datos.etapaId);
    if (!cuentaId) {
      await omitir(d.idOpai1, "cuenta_no_importada");
      continue;
    }
    if (!embudoId) {
      await omitir(d.idOpai1, "etapa_no_existe_en_la_empresa");
      continue;
    }
    const n = await tx.negocio.create({
      data: {
        tenantId,
        cuentaId,
        embudoId,
        etapaId: d.datos.etapaId,
        titulo: d.datos.titulo,
        montoEstimadoMensual: d.datos.montoEstimadoMensual,
        probabilidad: d.datos.probabilidad,
        cierreEstimado: fecha(d.datos.cierreEstimado),
        cotizacionEnviadaEn: fecha(d.datos.cotizacionEnviadaEn),
      },
      select: { id: true },
    });
    // Sin fila de historial: es append-only en la base y un negocio con historial ya no se puede
    // borrar, así que la corrida no sería reversible. El tiempo en etapa cuenta desde su creación.
    await anotar(d.idOpai1, n.id, "creado");
    creados += 1;
  }
  return { creados, omitidos };
}
