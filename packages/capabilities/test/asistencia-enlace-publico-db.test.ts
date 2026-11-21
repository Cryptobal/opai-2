import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { digitoVerificador } from "@opai/domain";

import { hmacDispositivo, LARGO_CODIGO_MARCACION_PUBLICA, nuevoCodigoMarcacionPublica } from "@opai/db";

import { manifest } from "../../../modules/asistencia/manifest";
import { PIN_SIMULADO } from "../../../modules/asistencia/capabilities";
import { prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const rutPrueba = () => {
  const cuerpo = String(
    parseInt(randomUUID().replace(/-/g, "").slice(0, 8), 16) % 90_000_000 + 10_000_000,
  );
  return `${cuerpo}-${digitoVerificador(cuerpo)}`;
};

describe.skipIf(!urlPropietario)("Asistencia · enlace público (CAR-606)", () => {
  let e: Awaited<ReturnType<typeof prepararEntorno>>;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let instId = "";
  let personaId = "";
  const codigo = nuevoCodigoMarcacionPublica();

  const medidor = { registrar: async () => undefined };
  const sistema = (t: string) =>
    mod.crearContexto({ tenantId: t, actor: { tipo: "system" }, portal: null, modulosActivos: ["asistencia"], medidor });
  const erp = (t: string) =>
    mod.crearContexto({
      tenantId: t,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["asistencia"],
      medidor,
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const tenant = await e.admin.tenant.create({
      data: { slug: `qa-enlace-${randomUUID().slice(0, 6)}`, nombre: "QA Enlace", vertical: "seguridad" },
    });
    tenantId = tenant.id;
    const cuenta = await e.admin.cuenta.create({
      data: { tenantId, nombre: "Cliente", razonSocial: "Cliente SA", rut: "76555555-5" },
    });
    const inst = await e.admin.instalacion.create({
      data: { tenantId, cuentaId: cuenta.id, nombre: "Portería", lat: -33.4, lng: -70.6, geocercaM: 100 },
    });
    instId = inst.id;
    const cargo = await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } });
    const persona = await e.admin.persona.create({
      data: { tenantId, nombres: "Ana", apellidos: "Prueba", rut: rutPrueba(), estado: "activo" },
    });
    personaId = persona.id;
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId,
        personaId,
        cargoId: cargo.id,
        instalacionId: instId,
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
        estado: "vigente",
        horasSemanales: 40,
        distribucion: "5x2",
      },
    });
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    await e.admin.turnoEsperado.create({
      data: {
        tenantId,
        personaId,
        fecha: hoy,
        inicio: new Date(hoy.getTime() + 12 * 60 * 60_000),
        fin: new Date(hoy.getTime() + 20 * 60 * 60_000),
        instalacionId: instId,
        origen: "pauta",
        colacionMin: 0,
      },
    });
    await e.admin.ajuste.create({
      data: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "asistencia", clave: "marcas_habilitadas", valor: true },
    });
    await e.admin.ajuste.create({
      data: {
        tenantId,
        ambito: "tenant",
        sujetoId: tenantId,
        modulo: "asistencia",
        clave: "canales_por_instalacion",
        valor: { [instId]: ["kiosco", "enlace_publico"] },
      },
    });
    await e.admin.codigoMarcacionPublica.create({
      data: { tenantId, instalacionId: instId, codigoHash: hmacDispositivo(codigo) },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("rechaza código corto", async () => {
    const r = await mod.executeCapability(sistema(tenantId), "asistencia.marcas.enlace_publico_resolver", {
      codigo: "corto",
    });
    expect(r.ok).toBe(false);
  });

  it("rechaza código con formato válido pero inexistente", async () => {
    const fantasma = randomBytes(16).toString("base64url");
    const r = await mod.executeCapability(sistema(tenantId), "asistencia.marcas.enlace_publico_resolver", {
      codigo: fantasma,
    });
    expect(r.ok).toBe(false);
  });

  it("resuelve el enlace sin revelar personas", async () => {
    const r = await mod.executeCapability(sistema(tenantId), "asistencia.marcas.enlace_publico_resolver", { codigo });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ instalacionNombre: "Portería", empresaNombre: "Cliente SA" });
  });

  it("registra con canal enlace_publico (RUT + PIN)", async () => {
    const r = await mod.executeCapability(sistema(tenantId), "asistencia.marcas.registrar", {
      personaId,
      instalacionId: instId,
      metodo: "rut_pin",
      credencial: PIN_SIMULADO,
      claveDispositivo: randomUUID(),
      enlacePublicoValidado: true,
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (r.ok) {
      const data = r.data as { marca: { id: string } };
      const fila = await e.admin.marca.findUnique({ where: { id: data.marca.id } });
      expect(fila?.canal).toBe("enlace_publico");
    }
  });

  it("rotar invalida el código anterior", async () => {
    const rot = await mod.executeCapability(erp(tenantId), "asistencia.marcas.enlace_publico_rotar", { instalacionId: instId });
    expect(rot.ok).toBe(true);
    if (rot.ok) expect((rot.data as { codigo: string }).codigo).toHaveLength(LARGO_CODIGO_MARCACION_PUBLICA);
    const viejo = await mod.executeCapability(sistema(tenantId), "asistencia.marcas.enlace_publico_resolver", { codigo });
    expect(viejo.ok).toBe(false);
  });
});