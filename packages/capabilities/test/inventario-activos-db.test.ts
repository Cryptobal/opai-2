// CAR-236 · Activos de Inventario contra Postgres real (rol sin BYPASSRLS): registrar con campos propios,
// código único, corregir, reparación y baja sin vuelta atrás, aprobación del agente para la baja,
// permisos y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { activosCambiarEstado } from "../src/inventario/activos-estado";
import { limpiarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

type Activo = { id: string; codigo: string; estado: string; valores: Record<string, unknown>; motivoBaja: string | null };

describe.skipIf(!urlPropietario)("inventario · activos en base real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let ana = "";
  let telefono = "";
  let camisa = "";
  let activo = "";
  const sufijo = randomUUID().slice(0, 8);

  const ctx = (tenantId: string, rol: "owner" | "gerente" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: ana },
      usuario: { id: ana, nombre: "Ana", email: `ana-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["inventario"],
    });

  async function empresa(slug: string) {
    const t = await e.admin.tenant.create({
      data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" },
    });
    await e.admin.membership.create({ data: { tenantId: t.id, userId: ana, rol: "owner", portales: ["erp"] } });
    return t.id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesInventario]);
    ana = (
      await e.admin.user.create({ data: { name: "Ana", email: `ana-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    a = await empresa(`act-a-${sufijo}`);
    b = await empresa(`act-b-${sufijo}`);
    telefono = (
      await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", {
        categoria: "activo",
        nombre: "Teléfono",
        campos: [{ etiqueta: "IMEI", obligatorio: true }, { etiqueta: "Compra", tipo: "fecha" }],
      })
    ).id;
    camisa = (
      await dato<{ id: string }>(ctx(a), "inventario.tipos.crear", { categoria: "ropa", nombre: "Camisa", tallas: ["M"] })
    ).id;
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("la vista previa no guarda; después registra con sus campos propios", async () => {
    const input = { tipoId: telefono, codigo: "tel-01", valores: { imei: "356938035643809", compra: "2026-10-01" } };
    await dato(ctx(a), "inventario.activos.crear", input, { dryRun: true });
    expect(await e.admin.inventarioActivo.count({ where: { tenantId: a } })).toBe(0);
    const r = await dato<Activo>(ctx(a), "inventario.activos.crear", input);
    expect(r).toMatchObject({ codigo: "tel-01", estado: "disponible", valores: { imei: "356938035643809" } });
    activo = r.id;
  });

  it("R10 y R11: código único sin mayúsculas, campos obligatorios y tipo de ropa rechazado", async () => {
    const crear = (input: unknown) => codigo(ctx(a), "inventario.activos.crear", input);
    expect(await crear({ tipoId: telefono, codigo: " TEL-01 ", valores: { imei: "1" } })).toBe("CONFLICT");
    expect(await crear({ tipoId: telefono, codigo: "tel-02" })).toBe("UNPROCESSABLE");
    expect(await crear({ tipoId: telefono, codigo: "tel-02", valores: { imei: "1", color: "rojo" } })).toBe(
      "UNPROCESSABLE",
    );
    expect(await crear({ tipoId: camisa, codigo: "cam-01" })).toBe("UNPROCESSABLE");
  });

  it("corrige datos y lista por texto, tipo y estado", async () => {
    await dato(ctx(a), "inventario.activos.actualizar", { id: activo, numeroSerie: "SN-77", notas: "Puesto norte" });
    const porSerie = await dato<{ items: Activo[] }>(ctx(a), "inventario.activos.list", { q: "sn-7" });
    expect(porSerie.items.map((x) => x.id)).toEqual([activo]);
    const porTipo = await dato<{ items: Activo[] }>(ctx(a), "inventario.activos.list", { tipoId: camisa });
    expect(porTipo.items).toEqual([]);
  });

  it("R12: reparación va y vuelve; la baja pide motivo, aprobación al agente y no vuelve", async () => {
    const cambiar = (input: unknown) => codigo(ctx(a), "inventario.activos.cambiar_estado", { id: activo, ...(input as object) });
    expect(await cambiar({ estado: "en_reparacion" })).toBe("OK");
    expect(await cambiar({ estado: "disponible" })).toBe("OK");
    expect(await cambiar({ estado: "de_baja" })).toBe("UNPROCESSABLE");
    // A un agente, la baja le pide aprobación humana (ADR-034); reparar no.
    expect(activosCambiarEstado.exigeAprobacion?.({ id: activo, estado: "de_baja", motivo: "Perdido" })).toBe(true);
    expect(activosCambiarEstado.exigeAprobacion?.({ id: activo, estado: "en_reparacion" })).toBe(false);
    const baja = await dato<Activo>(ctx(a), "inventario.activos.cambiar_estado", {
      id: activo,
      estado: "de_baja",
      motivo: "Perdido en turno",
    });
    expect(baja).toMatchObject({ estado: "de_baja", motivoBaja: "Perdido en turno" });
    expect(await cambiar({ estado: "disponible" })).toBe("UNPROCESSABLE");
    expect(await codigo(ctx(a), "inventario.activos.actualizar", { id: activo, notas: "x" })).toBe("UNPROCESSABLE");
    expect((await dato<{ items: Activo[] }>(ctx(a), "inventario.activos.list", {})).items).toEqual([]);
    const conBaja = await dato<{ items: Activo[] }>(ctx(a), "inventario.activos.list", { incluirBaja: true });
    expect(conBaja.items.map((x) => x.id)).toEqual([activo]);
  });

  it("el gerente registra; el lector solo ve", async () => {
    const input = { tipoId: telefono, codigo: "tel-03", valores: { imei: "2" } };
    expect(await codigo(ctx(a, "viewer"), "inventario.activos.crear", input)).toBe("FORBIDDEN");
    expect(await codigo(ctx(a, "gerente"), "inventario.activos.crear", input)).toBe("OK");
    expect(await codigo(ctx(a, "viewer"), "inventario.activos.list", {})).toBe("OK");
  });

  it("ninguna empresa ve ni usa los activos ni los tipos de otra", async () => {
    expect((await dato<{ items: Activo[] }>(ctx(b), "inventario.activos.list", { incluirBaja: true })).items).toEqual([]);
    expect(await codigo(ctx(b), "inventario.activos.get", { id: activo })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b), "inventario.activos.crear", { tipoId: telefono, codigo: "x", valores: { imei: "1" } })).toBe(
      "NOT_FOUND",
    );
  });
});
