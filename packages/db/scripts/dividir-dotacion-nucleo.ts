// Núcleo de `dividir-dotacion.ts` (Brief 11 · Puestos PR 1), separado del CLI para probarlo contra
// Postgres real. Divide los puestos de UN tenant con `dotacion > 1` en N posiciones: el original
// queda con dotacion 1 y se crean N-1 copias en PPC «Sin asignar», con la capa de sueldo de nivel
// puesto copiada (si no, las copias resolverían el sueldo por el cargo).
//
// Cada puesto se divide en su propia transacción, con compare-and-set sobre `dotacion`: si otra
// corrida ya lo dividió (o cambió), la escritura no aplica y el puesto se salta. Los nombres libres
// se leen dentro de la misma transacción.
import type { PrismaClient } from "../src/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type PuestoDividido = {
  originalId: string;
  instalacionId: string;
  nombre: string;
  dotacionOriginal: number;
  copias: { id: string | null; nombre: string }[];
  estructurasCopiadas: number;
};

export type ResultadoDivision = {
  tenantId: string;
  aplicado: boolean;
  puestos: PuestoDividido[];
  saltados: string[];
};

/** Nombre libre para la posición k dentro de la instalación: "<nombre> (k)", evitando choques. */
export function nombreLibre(base: string, k: number, usados: Set<string>): string {
  let n = k;
  let intento = `${base} (${n})`;
  while (usados.has(intento)) intento = `${base} (${++n})`;
  usados.add(intento);
  return intento;
}

async function nombresDeCopias(
  db: Tx | PrismaClient,
  p: { tenantId: string; instalacionId: string; nombre: string; dotacion: number },
) {
  const filas = await db.puesto.findMany({
    where: { tenantId: p.tenantId, instalacionId: p.instalacionId },
    select: { nombre: true },
  });
  const usados = new Set(filas.map((f) => f.nombre));
  const nombres: string[] = [];
  for (let k = 2; k <= p.dotacion; k++) nombres.push(nombreLibre(p.nombre, k, usados));
  return nombres;
}

async function copiarEstructuras(tx: Tx, tenantId: string, desde: string, hacia: string) {
  const estructuras = await tx.estructuraSueldo.findMany({
    where: { tenantId, nivel: "puesto", puestoId: desde },
    include: { items: true },
  });
  for (const { id: _id, createdAt: _c, updatedAt: _u, items, ...e } of estructuras) {
    await tx.estructuraSueldo.create({
      data: {
        ...e,
        puestoId: hacia,
        items: {
          create: items.map(
            ({ id: _i, estructuraId: _e, createdAt: _ci, updatedAt: _ui, ...it }) => it,
          ),
        },
      },
    });
  }
  return estructuras.length;
}

async function dividirUno(tx: Tx, tenantId: string, id: string): Promise<PuestoDividido | null> {
  const b = await tx.puesto.findFirst({ where: { id, tenantId } });
  if (!b || b.dotacion <= 1) return null;
  const marcado = await tx.puesto.updateMany({
    where: { id, tenantId, dotacion: b.dotacion },
    data: { dotacion: 1 },
  });
  if (marcado.count === 0) return null;
  const { id: _id, createdAt: _c, updatedAt: _u, nombre: _n, ...resto } = b;
  const copias: PuestoDividido["copias"] = [];
  let estructurasCopiadas = 0;
  for (const nombre of await nombresDeCopias(tx, b)) {
    const c = await tx.puesto.create({
      data: { ...resto, nombre, dotacion: 1, cobertura: "ppc", coberturaMotivo: "sin_asignar" },
    });
    estructurasCopiadas += await copiarEstructuras(tx, tenantId, b.id, c.id);
    copias.push({ id: c.id, nombre });
  }
  return {
    originalId: b.id,
    instalacionId: b.instalacionId,
    nombre: b.nombre,
    dotacionOriginal: b.dotacion,
    copias,
    estructurasCopiadas,
  };
}

/** Simula (aplicar=false) o aplica la división en un solo tenant. */
export async function dividirDotacion(
  db: PrismaClient,
  {
    tenantId,
    aplicar,
    alAplicar,
  }: { tenantId: string; aplicar: boolean; alAplicar?: (r: ResultadoDivision) => void },
): Promise<ResultadoDivision> {
  const candidatos = await db.puesto.findMany({
    where: { tenantId, dotacion: { gt: 1 } },
    orderBy: [{ instalacionId: "asc" }, { nombre: "asc" }],
  });
  const r: ResultadoDivision = { tenantId, aplicado: aplicar, puestos: [], saltados: [] };
  for (const p of candidatos) {
    if (!aplicar) {
      const estructuras = await db.estructuraSueldo.count({
        where: { tenantId, nivel: "puesto", puestoId: p.id },
      });
      const nombres = await nombresDeCopias(db, p);
      r.puestos.push({
        originalId: p.id,
        instalacionId: p.instalacionId,
        nombre: p.nombre,
        dotacionOriginal: p.dotacion,
        copias: nombres.map((nombre) => ({ id: null, nombre })),
        estructurasCopiadas: estructuras * nombres.length,
      });
      continue;
    }
    const hecho = await db.$transaction((tx) => dividirUno(tx, tenantId, p.id));
    if (hecho) r.puestos.push(hecho);
    else r.saltados.push(p.id);
    alAplicar?.(r); // respaldo tras cada puesto: si el proceso cae, el mapa llega hasta ahí
  }
  return r;
}
