// Reversión de una corrida `aplicar`: borra lo que creó y restaura los valores previos de lo que
// completó. Se niega entera si alguna fila se modificó después en 2.0, y la informa.
import { enTransaccion } from "../../src/index";
import type { TenantTx } from "../../src/transaccion";
import { dependientesPostImport } from "./revertir-dependientes";
import { previosDeFecha } from "./registro";

export type FilaBloqueada = { entidad: string; id10: string; motivo: string };

export type ResultadoReversion = {
  dryRun: boolean;
  revertida: boolean;
  porRevertir: { creadas: number; completadas: number };
  bloqueadas: FilaBloqueada[];
};

type Fila = { entidad: string; id10: string; id20: string | null; accion: string; previos: unknown };

const ORDEN_BORRADO = ["programacion_recurrente", "instalacion", "contacto", "cuenta"] as const;
const MODIFICADA = "modificada_despues_de_la_importacion";
const DEPENDIENTES = "tiene_dependientes_en_2_0";

async function modificadaDespues(tx: TenantTx, f: Fila, hasta: Date): Promise<boolean> {
  if (!f.id20) return false;
  const donde = { where: { id: f.id20 }, select: { updatedAt: true } } as const;
  const r =
    f.entidad === "cuenta" ? await tx.cuenta.findFirst(donde)
    : f.entidad === "contacto" ? await tx.contacto.findFirst(donde)
    : f.entidad === "instalacion" ? await tx.instalacion.findFirst(donde)
    : f.entidad === "programacion_recurrente" ? await tx.ventasProgramacion.findFirst(donde)
    : null;
  return r !== null && r.updatedAt.getTime() > hasta.getTime();
}

function valoresPrevios(previos: unknown): Record<string, unknown> {
  const o = (previos && typeof previos === "object" ? previos : {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(o)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => [k, previosDeFecha(v)]),
  );
}

const marca = (previos: unknown, clave: string) =>
  Boolean(previos && typeof previos === "object" && (previos as Record<string, unknown>)[clave]);

async function borrarCreada(tx: TenantTx, f: Fila): Promise<void> {
  const id = f.id20;
  if (!id) return;
  if (f.entidad === "programacion_recurrente") {
    await tx.ventasProgramacionCorrida.deleteMany({
      where: { programacionId: id, documentoId: null },
    });
    await tx.ventasProgramacionDestinatario.deleteMany({ where: { programacionId: id } });
    await tx.ventasProgramacionLinea.deleteMany({ where: { programacionId: id } });
    await tx.ventasProgramacion.delete({ where: { id } });
  } else if (f.entidad === "instalacion") {
    await tx.instalacion.delete({ where: { id } });
  } else if (f.entidad === "contacto") {
    await tx.contactoCuenta.deleteMany({ where: { contactoId: id } });
    await tx.contacto.delete({ where: { id } });
  } else if (f.entidad === "cuenta") {
    await tx.cuentaRepresentante.deleteMany({ where: { cuentaId: id } });
    await tx.cuenta.delete({ where: { id } });
  }
}

async function restaurar(tx: TenantTx, f: Fila): Promise<void> {
  const id = f.id20;
  if (!id) return;
  const data = valoresPrevios(f.previos);
  if (f.entidad === "cuenta") {
    if (Object.keys(data).length > 0) await tx.cuenta.update({ where: { id }, data });
    if (marca(f.previos, "_representanteCreado"))
      await tx.cuentaRepresentante.deleteMany({ where: { cuentaId: id } });
  } else if (f.entidad === "contacto" && Object.keys(data).length > 0) {
    await tx.contacto.update({ where: { id }, data });
  } else if (f.entidad === "instalacion" && Object.keys(data).length > 0) {
    await tx.instalacion.update({ where: { id }, data });
  }
}

export async function revertirCorrida(
  tenantId: string,
  importacionId: string,
  dryRun: boolean,
): Promise<ResultadoReversion> {
  return enTransaccion(
    tenantId,
    async (tx) => {
      const corrida = await tx.importacion.findFirst({ where: { id: importacionId } });
      if (!corrida || corrida.modo !== "aplicar") throw new Error("La corrida no existe o no es una importación aplicada.");
      if (corrida.estado === "revertida") throw new Error("La corrida ya fue revertida.");
      if (corrida.estado !== "completada" || !corrida.terminadaEn)
        throw new Error("Solo se puede revertir una corrida completada.");
      const filas: Fila[] = (await tx.importacionFila.findMany({ where: { importacionId } })).filter(
        (f) => f.accion === "creado" || f.accion === "completado" || f.accion === "sin_cambio",
      ).map((f) => ({ entidad: f.entidad, id10: f.id10, id20: f.id20, accion: f.accion, previos: f.previos }));
      const accionables = filas.filter((f) => f.accion !== "sin_cambio");
      const bloqueadas: FilaBloqueada[] = [];
      for (const f of accionables) {
        if (await modificadaDespues(tx, f, corrida.terminadaEn))
          bloqueadas.push({ entidad: f.entidad, id10: f.id10, motivo: MODIFICADA });
        else if (await dependientesPostImport(tx, f, corrida.terminadaEn))
          bloqueadas.push({ entidad: f.entidad, id10: f.id10, motivo: DEPENDIENTES });
      }
      const creadas = accionables.filter((f) => f.accion === "creado");
      const completadas = accionables.filter((f) => f.accion === "completado");
      const resumen = { creadas: creadas.length, completadas: completadas.length };
      if (dryRun || bloqueadas.length > 0)
        return { dryRun, revertida: false, porRevertir: resumen, bloqueadas };

      for (const f of completadas) await restaurar(tx, f);
      for (const ent of ORDEN_BORRADO)
        for (const f of creadas.filter((x) => x.entidad === ent)) await borrarCreada(tx, f);
      // Quita el vínculo con 1.0 de lo creado y de lo que se vinculó nuevo.
      for (const f of filas) {
        const nuevo = f.accion === "creado" || marca(f.previos, "_vinculoNuevo");
        if (nuevo)
          await tx.idExterno.deleteMany({
            where: { sistema: "opai1", entidadTipo: f.entidad, idExterno: f.id10 },
          });
      }
      await tx.importacion.update({
        where: { id: importacionId },
        data: { estado: "revertida", revertidaEn: new Date() },
      });
      return { dryRun, revertida: true, porRevertir: resumen, bloqueadas };
    },
    { timeoutMs: 120_000 },
  );
}
