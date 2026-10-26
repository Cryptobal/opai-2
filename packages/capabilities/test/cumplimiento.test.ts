import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Fila } from "../src/testing/db-memoria-util";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

type Estado = {
  versionVigente: string;
  publicada: boolean;
  aceptadaVigente: boolean;
  pendiente: boolean;
  ultima: { version: string; aceptadoPor: string | null } | null;
  historial: { version: string }[];
  dpo: { nombre: string | null; correo: string | null; telefono: string | null };
};

const publicar = (tabla: (n: string) => Fila[], version: string) =>
  tabla("ajustePlataforma").push({ modulo: "core", clave: "cumplimiento_dpa_version", valor: version, version: 1 });

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
    expect(e.historial.map((h) => h.version)).toEqual(["2026-10"]);
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

  it("el RAT lista las actividades de tratamiento del Núcleo (bases propuestas)", async () => {
    const { ctx } = contextoDePrueba();
    const rat = await dato<{
      basesPropuestas: boolean;
      actividades: { tabla: string; modulo: string; reguladoNoBorrable: boolean }[];
    }>(ctx, "core.cumplimiento.rat", {});
    expect(rat.basesPropuestas).toBe(true);
    const tablas = rat.actividades.map((a) => a.tabla);
    expect(tablas).toContain("personas");
    expect(rat.actividades.every((a) => a.modulo === "core")).toBe(true);
    expect(rat.actividades.find((a) => a.tabla === "vinculos_laborales")?.reguladoNoBorrable).toBe(
      true,
    );
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
