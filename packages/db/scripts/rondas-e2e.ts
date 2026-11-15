import type { TenantTx } from "../src/index";

// Fixture de Rondas para el e2e de terreno (CAR-78 · E3e, terreno-rondas-apoyo.ts): en la instalación
// ficticia «Planta Quilicura» (seed:maestros-demo), la plantilla «Ronda E2E» con dos puntos solo QR cuyos
// códigos son E2E-PUNTO-1 y E2E-PUNTO-2. Datos ficticios, solo base local de e2e. Idempotente.
export const RONDAS_E2E = {
  plantilla: "00000000-0000-7000-8000-0000000c0001",
  puntos: [
    { id: "00000000-0000-7000-8000-0000000c0002", etiqueta: "00000000-0000-7000-8000-0000000c0012", nombre: "Portón E2E", codigo: "E2E-PUNTO-1" },
    { id: "00000000-0000-7000-8000-0000000c0003", etiqueta: "00000000-0000-7000-8000-0000000c0013", nombre: "Bodega E2E", codigo: "E2E-PUNTO-2" },
  ],
} as const;

export async function sembrarRondasE2E(db: TenantTx, tenantId: string): Promise<boolean> {
  const instalacion = await db.instalacion.findFirst({ where: { nombre: "Planta Quilicura" }, select: { id: true } });
  if (!instalacion) return false;
  await db.tenantModule.upsert({
    where: { tenantId_moduloId: { tenantId, moduloId: "rondas" } },
    update: { estado: "activo" },
    create: { tenantId, moduloId: "rondas", estado: "activo" },
  });
  for (const p of RONDAS_E2E.puntos) {
    await db.puntoControl.upsert({
      where: { id: p.id },
      update: { estado: "activo", etiquetaQr: p.codigo },
      create: { id: p.id, tenantId, instalacionId: instalacion.id, nombre: p.nombre, modo: "qr", etiquetaQr: p.codigo },
    });
    await db.etiquetaQr.upsert({
      where: { id: p.etiqueta },
      update: { estado: "vigente" },
      create: { id: p.etiqueta, tenantId, puntoId: p.id, codigo: p.codigo, firmada: false, origen: "importada_1_0" },
    });
  }
  await db.plantillaRonda.upsert({
    where: { id: RONDAS_E2E.plantilla },
    update: { estado: "activo", permiteAdhoc: true },
    create: {
      id: RONDAS_E2E.plantilla, tenantId, instalacionId: instalacion.id, nombre: "Ronda E2E",
      tiempoMaxMin: 60, permiteAdhoc: true,
    },
  });
  for (const [i, p] of RONDAS_E2E.puntos.entries()) {
    await db.plantillaPunto.upsert({
      where: { tenantId_plantillaId_puntoId: { tenantId, plantillaId: RONDAS_E2E.plantilla, puntoId: p.id } },
      update: { orden: i + 1, obligatorio: true },
      create: { tenantId, plantillaId: RONDAS_E2E.plantilla, puntoId: p.id, orden: i + 1, obligatorio: true },
    });
  }
  return true;
}
