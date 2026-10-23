import { beforeEach, describe, expect, it } from "vitest";

import { registrarTrabajos, limpiarTrabajos } from "../src";
import { trabajoVencimientosDocumentos } from "../src/core/documentos/trabajos";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(() => {
  reiniciar();
  limpiarTrabajos();
});

const H1 = "1".repeat(64);
const H2 = "2".repeat(64);

async function base() {
  const p = contextoDePrueba();
  const persona = await dato<{ id: string }>(p.ctx, "core.personas.create", {
    nombres: "Ana",
    apellidos: "Rojas",
    rut: "19.876.543-0",
  });
  const os10 = await dato<{ id: string }>(p.ctx, "core.documento_tipos.create", {
    codigo: "os10",
    capa: "persona",
    nombre: "Credencial OS-10",
    obligatorio: true,
    tieneVencimiento: true,
    mimesPermitidos: ["application/pdf"],
  });
  const entidad = { tipo: "persona", id: persona.id };
  return { ...p, entidad, tipoId: os10.id };
}

type Inicio = {
  documento: { id: string };
  subida: { url: string; cabeceras: Record<string, string> } | null;
  duplicados: unknown[];
};

describe("core.documentos.*", () => {
  it("sube en dos pasos: firma con huella, verifica, registra en bitácora y mide", async () => {
    const { ctx, entidad, tipoId, tabla, almacen, usos } = await base();
    const entrada = {
      entidad,
      tipoId,
      nombre: "../os10 María.pdf",
      mime: "application/pdf",
      tamano: 2_000_000,
      sha256: H1,
      venceEn: "2027-01-31",
    };
    const previa = await dato<Inicio>(ctx, "core.documentos.iniciar_subida", entrada, {
      dryRun: true,
    });
    expect(previa.subida).toBeNull();
    expect(tabla("documento")).toHaveLength(0);
    const ini = await dato<Inicio>(ctx, "core.documentos.iniciar_subida", entrada);
    expect(ini.subida?.cabeceras["x-amz-checksum-sha256"]).toBe(H1);
    const doc = tabla("documento")[0] as { storageKey: string; nombre: string };
    expect(doc.nombre).toBe("os10 María.pdf");
    expect(await codigo(ctx, "core.documentos.confirmar_subida", { id: ini.documento.id })).toBe(
      "UNPROCESSABLE",
    );
    almacen.subir(doc.storageKey, 2_000_000, "application/pdf", H2);
    expect(await codigo(ctx, "core.documentos.confirmar_subida", { id: ini.documento.id })).toBe(
      "UNPROCESSABLE",
    );
    almacen.subir(doc.storageKey, 2_000_000, "application/pdf", H1);
    const ok = await dato<{ estado: string; bitacoraSeq: number }>(
      ctx,
      "core.documentos.confirmar_subida",
      { id: ini.documento.id },
    );
    expect(ok).toMatchObject({ estado: "disponible", bitacoraSeq: 1 });
    expect(tabla("evento").map((e) => e["tipo"])).toContain("core.documento.registrado");
    expect(usos.find((u) => u.recurso === "almacenamiento.subida")).toMatchObject({ cantidad: 2 });
    const lista = await dato<{ items: { vigencia: string }[]; faltantes: unknown[] }>(
      ctx,
      "core.documentos.list",
      { entidad },
    );
    expect(lista).toMatchObject({ items: [{ vigencia: "vigente" }], faltantes: [] });
    const url = await dato<{ url: string }>(ctx, "core.documentos.url_descarga", {
      id: ini.documento.id,
    });
    expect(url.url).toContain("exp=300");
  });

  it("valida formato, tamaño, vencimiento exigido y capa del tipo", async () => {
    const { ctx, entidad, tipoId, tabla } = await base();
    const ok = {
      entidad,
      tipoId,
      nombre: "a.pdf",
      mime: "application/pdf",
      tamano: 10,
      sha256: H1,
      venceEn: "2027-01-01",
    };
    expect(await codigo(ctx, "core.documentos.iniciar_subida", { ...ok, mime: "image/png" })).toBe(
      "UNPROCESSABLE",
    );
    expect(
      await codigo(ctx, "core.documentos.iniciar_subida", { ...ok, tamano: 26 * 1024 * 1024 }),
    ).toBe("UNPROCESSABLE");
    expect(await codigo(ctx, "core.documentos.iniciar_subida", { ...ok, venceEn: undefined })).toBe(
      "UNPROCESSABLE",
    );
    const cuenta = await dato<{ id: string }>(ctx, "core.cuentas.create", { nombre: "Andina" });
    expect(
      await codigo(ctx, "core.documentos.iniciar_subida", {
        ...ok,
        entidad: { tipo: "cuenta", id: cuenta.id },
      }),
    ).toBe("UNPROCESSABLE");
    const faltan = await dato<{ faltantes: { nombre: string }[] }>(ctx, "core.documentos.list", {
      entidad,
    });
    expect(faltan.faltantes.map((f) => f.nombre)).toEqual(["Credencial OS-10"]);
    expect(tabla("documento")).toHaveLength(0);
  });

  it("una nueva versión reemplaza a la anterior; el propietario no se desvincula", async () => {
    const { ctx, entidad, tipoId, tabla, almacen } = await base();
    const subir = async (sha256: string, reemplazaAId?: string) => {
      const r = await dato<Inicio>(ctx, "core.documentos.iniciar_subida", {
        entidad,
        tipoId,
        nombre: "os10.pdf",
        mime: "application/pdf",
        tamano: 5,
        sha256,
        venceEn: "2027-01-01",
        ...(reemplazaAId ? { reemplazaAId } : {}),
      });
      const fila = tabla("documento").find((d) => d["id"] === r.documento.id) as {
        storageKey: string;
      };
      almacen.subir(fila.storageKey, 5, "application/pdf", sha256);
      return dato<{ id: string; version: number }>(ctx, "core.documentos.confirmar_subida", {
        id: r.documento.id,
      });
    };
    const v1 = await subir(H1);
    const v2 = await subir(H2, v1.id);
    expect(v2.version).toBe(2);
    const get = await dato<{ versiones: { id: string; estado: string }[] }>(
      ctx,
      "core.documentos.get",
      { id: v2.id },
    );
    expect(get.versiones).toEqual([expect.objectContaining({ id: v1.id, estado: "reemplazado" })]);
    expect(await codigo(ctx, "core.documentos.desvincular", { id: v2.id, entidad })).toBe(
      "UNPROCESSABLE",
    );
    const inst = await dato<{ id: string }>(ctx, "core.cuentas.create", { nombre: "Andina" });
    await dato(ctx, "core.documentos.vincular", {
      id: v2.id,
      entidad: { tipo: "cuenta", id: inst.id },
    });
    expect(
      await codigo(ctx, "core.documentos.vincular", {
        id: v2.id,
        entidad: { tipo: "cuenta", id: inst.id },
      }),
    ).toBe("CONFLICT");
    await dato(ctx, "core.documentos.desvincular", {
      id: v2.id,
      entidad: { tipo: "cuenta", id: inst.id },
    });
  });

  it("la escalera de vencimientos avisa una vez por hito", async () => {
    const { ctx, tabla } = await base();
    registrarTrabajos([trabajoVencimientosDocumentos]);
    tabla("documento").push({
      id: "0192f3a0-0000-7000-8000-0000000000d1",
      tenantId: ctx.tenantId,
      nombre: "x.pdf",
      mime: "application/pdf",
      tamano: 1,
      estado: "disponible",
      venceEn: new Date("2026-11-05T00:00:00Z"),
      hitoNotificado: null,
    });
    const correr = (dia: string) => trabajoVencimientosDocumentos.ejecutar(ctx, { dia });
    expect(await correr("2026-10-23")).toMatchObject({ avisos: 1 });
    expect(await correr("2026-10-24")).toMatchObject({ avisos: 0 });
    expect(await correr("2026-11-06")).toMatchObject({ avisos: 1 });
    expect(
      tabla("evento")
        .map((e) => e["tipo"])
        .filter((t) => String(t).startsWith("core.documento.")),
    ).toEqual(["core.documento.por_vencer", "core.documento.vencido"]);
  });
});
