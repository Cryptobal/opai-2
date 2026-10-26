import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Fila } from "../src/testing/db-memoria-util";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

type Estado = {
  versionVigente: string;
  publicada: boolean;
  aceptadaVigente: boolean;
  pendiente: boolean;
  ultima: {
    version: string;
    aceptadoPor: string | null;
    aceptadoPorNombre: string | null;
    aceptadoPorCorreo: string | null;
  } | null;
  historial: { version: string }[];
  dpo: { nombre: string | null; correo: string | null; telefono: string | null };
};

type Rat = {
  basesPropuestas: boolean;
  actividades: {
    id: number;
    actividad: string;
    datos: string[];
    categoria: string;
    categorias: string[];
    base: string;
    retencion: string | null;
    retencionPendiente: boolean;
    destinatarios: string[];
    tablas: string[];
  }[];
  conteos: { categoria: string; total: number }[];
  porTabla: { tabla: string; modulo: string; reguladoNoBorrable: boolean; campos: string[] }[];
};

const publicarVersion = (tabla: (n: string) => Fila[], version: string) =>
  tabla("ajustePlataforma").push({ modulo: "core", clave: "cumplimiento_dpa_version", valor: version, version: 1 });

// OPAI publica versión y texto del DPA. La aceptación exige ambos: sin texto no hay a qué aceptar.
const publicar = (tabla: (n: string) => Fila[], version: string, texto = `Texto del DPA ${version}`) => {
  publicarVersion(tabla, version);
  tabla("ajustePlataforma").push({ modulo: "core", clave: "cumplimiento_dpa_texto", valor: texto, version: 1 });
};

describe("core.cumplimiento.* · DPA y DPO (Brief 07d, PR 1)", () => {
  it("sin DPA publicado: no aparece pendiente y aceptar falla", async () => {
    const { ctx } = contextoDePrueba();
    const e = await dato<Estado>(ctx, "core.cumplimiento.estado", {});
    expect(e).toMatchObject({ publicada: false, aceptadaVigente: false, pendiente: false });
    expect(e.historial).toEqual([]);
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("UNPROCESSABLE");
  });

  it("con DPA publicado queda pendiente hasta que el owner lo acepta, y se guarda el historial", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicar(tabla, "2026-10");
    expect(await dato<Estado>(ctx, "core.cumplimiento.estado", {})).toMatchObject({
      publicada: true,
      aceptadaVigente: false,
      pendiente: true,
    });
    const r = await dato<{ version: string }>(ctx, "core.cumplimiento.dpa_aceptar", {});
    expect(r.version).toBe("2026-10");
    const e = await dato<Estado>(ctx, "core.cumplimiento.estado", {});
    expect(e).toMatchObject({ aceptadaVigente: true, pendiente: false });
    expect(e.ultima?.aceptadoPor).toContain(USUARIO_DE_PRUEBA.email);
    // «Aceptado por» estructurado (C02/C05): nombre y correo separados, además del string compat.
    expect(e.ultima?.aceptadoPorNombre).toBe(USUARIO_DE_PRUEBA.nombre);
    expect(e.ultima?.aceptadoPorCorreo).toBe(USUARIO_DE_PRUEBA.email);
    expect(e.historial.map((h) => h.version)).toEqual(["2026-10"]);
  });

  it("dpa_texto devuelve texto y hash, y el hash calza con el documento_ref de la aceptación (C06/C03)", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicar(tabla, "2026-10", "Texto exacto del DPA 2026-10");
    const t = await dato<{ versionVigente: string; publicada: boolean; texto: string | null; sha256: string | null }>(
      ctx,
      "core.cumplimiento.dpa_texto",
      {},
    );
    expect(t).toMatchObject({ versionVigente: "2026-10", publicada: true, texto: "Texto exacto del DPA 2026-10" });
    expect(t.sha256).toMatch(/^[0-9a-f]{64}$/);
    // Acepta y compara el hash de la lectura con el que quedó en documento_ref (sin duplicar la lógica).
    await dato(ctx, "core.cumplimiento.dpa_aceptar", {});
    const fila = tabla("dpaAceptacion")[0] as { documentoRef: string };
    expect(fila.documentoRef).toBe(`2026-10:sha256:${t.sha256}`);
  });

  it("dpa_texto con versión pero sin texto: texto y sha256 null, sin error (C06)", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicarVersion(tabla, "2026-10"); // versión sin texto
    const t = await dato<{ publicada: boolean; texto: string | null; sha256: string | null }>(
      ctx,
      "core.cumplimiento.dpa_texto",
      {},
    );
    expect(t).toMatchObject({ publicada: true, texto: null, sha256: null });
  });

  it("dpa_texto sin DPA publicado: publicada false y texto null", async () => {
    const { ctx } = contextoDePrueba();
    const t = await dato<{ versionVigente: string; publicada: boolean; texto: string | null }>(
      ctx,
      "core.cumplimiento.dpa_texto",
      {},
    );
    expect(t).toMatchObject({ versionVigente: "", publicada: false, texto: null });
  });

  it("un rol sin cumplimiento.read no puede leer el texto del DPA (FORBIDDEN)", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "supervisor" });
    publicar(tabla, "2026-10");
    expect(await codigo(ctx, "core.cumplimiento.dpa_texto", {})).toBe("FORBIDDEN");
    expect(await codigo(ctx, "core.cumplimiento.rat", {})).toBe("FORBIDDEN");
  });

  it("el DPO rechaza un correo inválido con el texto de la sábana en español (C08)", async () => {
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.cumplimiento.dpo_set", { correo: "no-es-correo" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && JSON.stringify(r.error)).toContain("Ingresa un correo válido");
    const r2 = await executeCapability(ctx, "core.cumplimiento.dpo_set", { telefono: "abc" });
    expect(r2.ok).toBe(false);
    expect(r2.ok === false && JSON.stringify(r2.error)).toContain("Ingresa un teléfono válido");
  });

  it("con versión pero sin texto publicado, aceptar falla: no se acepta un DPA sin texto", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicarVersion(tabla, "2026-10"); // solo la versión, sin el texto
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("UNPROCESSABLE");
    // Tampoco el dryRun: el preview también valida.
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("UNPROCESSABLE");
  });

  it("aceptar una versión distinta de la vigente falla", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicar(tabla, "2026-10");
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", { version: "2025-01" })).toBe(
      "UNPROCESSABLE",
    );
  });

  it("dryRun de aceptar no persiste ninguna fila", async () => {
    const { ctx, tabla } = contextoDePrueba();
    publicar(tabla, "2026-10");
    await dato(ctx, "core.cumplimiento.dpa_aceptar", {}, { dryRun: true });
    expect(tabla("dpaAceptacion")).toHaveLength(0);
  });

  it("fijar el DPO lo deja visible en el estado", async () => {
    const { ctx } = contextoDePrueba();
    await dato(ctx, "core.cumplimiento.dpo_set", {
      nombre: "Paula Díaz",
      correo: "dpo@empresa.cl",
      telefono: "+56 9 1111 2222",
    });
    const e = await dato<Estado>(ctx, "core.cumplimiento.estado", {});
    expect(e.dpo).toMatchObject({ nombre: "Paula Díaz", correo: "dpo@empresa.cl" });
    expect(e.dpo.telefono).toBe("+56911112222");
  });

  it("el RAT mantiene el inventario técnico por tabla (bases propuestas)", async () => {
    const { ctx } = contextoDePrueba();
    const rat = await dato<Rat>(ctx, "core.cumplimiento.rat", {});
    expect(rat.basesPropuestas).toBe(true);
    const tablas = rat.porTabla.map((a) => a.tabla);
    expect(tablas).toContain("personas");
    expect(rat.porTabla.every((a) => a.modulo === "core")).toBe(true);
    expect(rat.porTabla.find((a) => a.tabla === "vinculos_laborales")?.reguladoNoBorrable).toBe(true);
  });

  it("el RAT da una fila por actividad, en lenguaje de negocio, con retención pendiente (C10)", async () => {
    const { ctx } = contextoDePrueba();
    const rat = await dato<Rat>(ctx, "core.cumplimiento.rat", {});
    const personal = rat.actividades.find((a) => a.actividad === "Gestión de personal de seguridad");
    expect(personal).toBeDefined();
    expect(personal?.tablas).toEqual(["personas", "vinculos_laborales"]);
    // Datos legibles, nunca nombres de columna.
    expect(personal?.datos).toContain("RUT");
    expect(personal?.datos.some((d) => d.includes("_"))).toBe(false);
    // Categoría principal una sola; el conjunto para el filtro.
    expect(personal?.categoria).toBe("Laboral");
    expect(personal?.categorias).toContain("Identificación");
    // Retención aún no fijada (PR 3, §16.4): pendiente, no "—".
    expect(personal?.retencion).toBeNull();
    expect(personal?.retencionPendiente).toBe(true);
    // Destinatarios derivados del inventario completado (Resend / IA, a confirmar por legal).
    const docs = rat.actividades.find((a) => a.actividad === "Documentos de personas");
    expect(docs?.destinatarios.some((d) => d.includes("Proveedor de IA"))).toBe(true);
    const envios = rat.actividades.find((a) => a.actividad === "Comunicaciones comerciales a contactos");
    expect(envios?.destinatarios.some((d) => d.includes("Resend"))).toBe(true);
  });

  it("el RAT filtra por «contiene la categoría» y devuelve conteos por categoría para los chips (C11)", async () => {
    const { ctx } = contextoDePrueba();
    const todo = await dato<Rat>(ctx, "core.cumplimiento.rat", {});
    // Los conteos cubren las 5 categorías y cuentan actividades que contienen la categoría.
    expect(todo.conteos.map((c) => c.categoria)).toEqual([
      "Identificación",
      "Contacto",
      "Laboral",
      "Económica",
      "Sensible",
    ]);
    const contacto = todo.conteos.find((c) => c.categoria === "Contacto")?.total ?? 0;
    expect(contacto).toBeGreaterThan(0);
    const filtrado = await dato<Rat>(ctx, "core.cumplimiento.rat", { categoria: "Contacto" });
    expect(filtrado.actividades.length).toBe(contacto);
    expect(filtrado.actividades.every((a) => a.categorias.includes("Contacto"))).toBe(true);
    // Los conteos no cambian al filtrar (son del conjunto completo).
    expect(filtrado.conteos).toEqual(todo.conteos);
  });

  it("aceptar el DPA es solo del owner: un admin es rechazado aunque fije el DPO (§16.1)", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "admin" });
    publicar(tabla, "2026-10");
    // Admin no acepta el DPA (es acto del owner, responsable del tratamiento)…
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("FORBIDDEN");
    // …pero sí fija el DPO (owner/admin).
    expect(await codigo(ctx, "core.cumplimiento.dpo_set", { nombre: "Paula" })).toBe("OK");
  });

  it("el owner sí acepta el DPA (contraparte del rechazo del admin)", async () => {
    const { ctx, tabla } = contextoDePrueba({ rol: "owner" });
    publicar(tabla, "2026-10");
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("OK");
  });

  it("un agente (API key) no puede aceptar el DPA ni fijar el DPO (soloPersonas)", async () => {
    const { ctx, tabla } = contextoDePrueba({
      usuario: USUARIO_DE_PRUEBA,
      actor: { tipo: "agent", id: USUARIO_DE_PRUEBA.id, viaUserId: USUARIO_DE_PRUEBA.id },
      scopes: ["*"],
    });
    publicar(tabla, "2026-10");
    expect(await codigo(ctx, "core.cumplimiento.dpa_aceptar", {})).toBe("FORBIDDEN");
    expect(await codigo(ctx, "core.cumplimiento.dpo_set", { nombre: "X" })).toBe("FORBIDDEN");
  });
});
