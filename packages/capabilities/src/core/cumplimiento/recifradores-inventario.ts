import { estaCifrado } from "./cifrado-campos";
import type { Recifrador } from "./rotar-dek";

async function recifrarStringColumna(
  filas: { id: string; valor: string | null }[],
  escribir: (id: string, valor: string) => Promise<void>,
  recifrar: (guardado: string) => string,
): Promise<number> {
  let n = 0;
  for (const f of filas) {
    if (!f.valor || !estaCifrado(f.valor)) continue;
    await escribir(f.id, recifrar(f.valor));
    n += 1;
  }
  return n;
}

/** Recifradores de los campos sensibles declarados en el inventario del núcleo (rotación DEK §22). */
export const recifradoresInventarioNucleo: Readonly<Record<string, Recifrador>> = {
  "personas_prevision.plan_isapre": async (tx, recifrar) => {
    const filas = await tx.personaPrevision.findMany({
      where: { planIsapre: { not: null } },
      select: { id: true, planIsapre: true },
    });
    return recifrarStringColumna(
      filas.map((f) => ({ id: f.id, valor: f.planIsapre })),
      (id, valor) => tx.personaPrevision.update({ where: { id }, data: { planIsapre: valor } }).then(() => undefined),
      recifrar,
    );
  },
  "personas_pago.numero_cuenta": async (tx, recifrar) => {
    const filas = await tx.personaPago.findMany({
      where: { numeroCuenta: { not: null } },
      select: { id: true, numeroCuenta: true },
    });
    return recifrarStringColumna(
      filas.map((f) => ({ id: f.id, valor: f.numeroCuenta })),
      (id, valor) => tx.personaPago.update({ where: { id }, data: { numeroCuenta: valor } }).then(() => undefined),
      recifrar,
    );
  },
  "personas_pago_solicitudes.numero_cuenta": async (tx, recifrar) => {
    const filas = await tx.personaPagoSolicitud.findMany({
      where: { numeroCuenta: { not: null } },
      select: { id: true, numeroCuenta: true },
    });
    return recifrarStringColumna(
      filas.map((f) => ({ id: f.id, valor: f.numeroCuenta })),
      (id, valor) =>
        tx.personaPagoSolicitud.update({ where: { id }, data: { numeroCuenta: valor } }).then(() => undefined),
      recifrar,
    );
  },
};
