import { describe, expect, it, vi } from "vitest";

import { escribirComprasQa } from "../scripts/compras-qa-escribir";
import { ejecutarComprasQaPreview } from "../scripts/compras-qa-preview-ejecutar";
import { diagnosticoComprasQa } from "../scripts/compras-qa-preview-error";
import type { PrismaClient } from "../src/generated/prisma/client";
import { metadataPreviewQa } from "./compras-qa-preview-fixture";

function dependencias(fallo: string, estado = "activo") {
  const meta = metadataPreviewQa();
  const bruto = "ENTRADA FICTICIA QUE NO SE DEBE RETENER";
  const fallar = () => { throw Object.assign(new Error(bruto), { input: bruto }); };
  const lectura = (etapa: string) => vi.fn(async () => fallo === etapa ? fallar() : []);
  const insercion = (etapa: string) => vi.fn(async () => { if (fallo === etapa) fallar(); });
  const tx = {
    tenant: { findUnique: vi.fn(async () => {
      if (fallo === "TENANT_CONSULTA") fallar();
      if (fallo === "TENANT_AUSENTE") return null;
      const estadoTenant = fallo === "TENANT_ESTADO" ? "estado-ficticio-ajeno" :
        fallo === "TENANT_SUSPENDIDO" ? "suspendido" : estado;
      return { id: "tenant-ficticio", estado: estadoTenant };
    }) },
    proveedor: { findMany: lectura("INTEGRIDAD"), create: insercion("INSERT_PROVEEDOR") },
    cuentaBancaria: { findMany: lectura(""), create: insercion("INSERT_CUENTA") },
    documentoRecibido: { findMany: lectura(""), createMany: insercion("INSERT_DOCUMENTOS") },
    movimientoBancario: { findMany: lectura(""), create: insercion("INSERT_MOVIMIENTO") },
    conciliacionBanco: { findMany: lectura(""), create: insercion("INSERT_CONCILIACION") },
  };
  const desconectar = vi.fn(async () => {
    if (fallo === "TENANT_ESTADO") fallar();
  });
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true, redirected: false, url, json: async () => url.endsWith("/endpoints") ? meta.endpoints : meta.branch,
  }) as Response);
  const db = {
    $disconnect: desconectar,
    $transaction: async (ejecutarTx: (datos: typeof tx) => Promise<void>) => {
      if (fallo === "TX") fallar();
      await ejecutarTx(tx);
    },
  } as unknown as PrismaClient;
  const ejecutar = () => ejecutarComprasQaPreview(meta.env, meta.evento, {
    fetch: fetchMock as unknown as typeof fetch,
    conectar: () => db,
  });
  return { ejecutar, desconectar, bruto, tx, db };
}

describe("subetapas sanitizadas de la fixture exacta", () => {
  it.each([
    "TX", "TENANT_CONSULTA", "TENANT_AUSENTE", "TENANT_SUSPENDIDO", "TENANT_ESTADO", "INTEGRIDAD", "INSERT_PROVEEDOR",
    "INSERT_CUENTA", "INSERT_DOCUMENTOS", "INSERT_MOVIMIENTO", "INSERT_CONCILIACION",
  ])("distingue %s sin conservar datos del error", async (fallo) => {
    const { ejecutar, desconectar, bruto, tx } = dependencias(fallo);
    const error = await ejecutar().catch((e: unknown) => e);
    const diagnostico = diagnosticoComprasQa(error);
    expect(diagnostico).toContain(`[FIXTURE_${fallo}]`);
    expect(diagnostico.includes("[CERRAR_CLIENTE]")).toBe(fallo === "TENANT_ESTADO");
    expect(diagnostico).not.toContain(bruto);
    expect(error).not.toHaveProperty("input");
    expect(error).not.toHaveProperty("cause");
    expect(desconectar).toHaveBeenCalledOnce();
    if (fallo.startsWith("TENANT_")) {
      expect(tx.proveedor.findMany).not.toHaveBeenCalled();
      expect(tx.proveedor.create).not.toHaveBeenCalled();
    }
  });
  it.each(["activo", "trial"])("admite únicamente estado elegible %s en preview verificada", async (estado) => {
    const { ejecutar, tx } = dependencias("SIN_FALLO", estado);
    await expect(ejecutar()).resolves.toBeUndefined();
    expect(tx.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "qa-e2e" }, select: { id: true, estado: true },
    });
    expect(tx.conciliacionBanco.create).toHaveBeenCalledOnce();
  });
  it("no cambia la exigencia de activo para el wrapper local", async () => {
    const { db, tx } = dependencias("SIN_FALLO", "trial");
    await expect(escribirComprasQa(db)).rejects.toThrow("Falta qa-e2e activo.");
    expect(tx.proveedor.create).not.toHaveBeenCalled();
  });
});
