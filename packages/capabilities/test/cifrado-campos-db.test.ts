// Cifrado de aplicación de los campos sensibles del inventario (Ley 21.719, Brief 07d PR 3 B11)
// contra Postgres real: nada en claro, ligado a tenant+tabla+columna, solo lo declarado sensible, y
// legible tras rotar la KEK (la rotación recifra la DEK del tenant, no los datos).
import { randomBytes, randomUUID } from "node:crypto";
import { defineDatosPersonales } from "@opai/domain";
import { cifrar, descifrar } from "@opai/integrations";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import { crearCifradoDeCampos, kidDe, recifrarValor } from "../src/core/cumplimiento/cifrado-campos";
import type * as ModuloCapacidades from "../src";

const generarDekPrueba = () => randomBytes(32);

// Inventario de prueba: salud y biometría aún no existen como tablas (llegan en fase 4).
const INVENTARIO = defineDatosPersonales("prueba", [
  {
    tabla: "fichas_salud",
    finalidad: "Ficha de salud ocupacional de la persona trabajadora (prueba).",
    categorias: ["sensible"],
    campos: ["diagnostico", "huella"],
    camposSensibles: ["diagnostico", "huella"],
    baseLicitud: "obligacion_legal",
  },
]);

describe.skipIf(!urlPropietario)("cifrado de campos sensibles en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  const previas = { ...process.env };
  // Versión alta: el script `rotar-kek` (que prueba secretos-db en paralelo) solo toca versiones menores.
  const v1 = randomBytes(32).toString("base64");

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    Object.assign(process.env, { OPAI_SECRETS_KEY: v1, OPAI_SECRETS_KEY_VERSION: "99" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tA = (await tenant(`cif-a-${s}`)).id;
    tB = (await tenant(`cif-b-${s}`)).id;
  });

  afterAll(async () => {
    for (const k of ["OPAI_SECRETS_KEY", "OPAI_SECRETS_KEY_VERSION", "OPAI_SECRETS_KEY_ANTERIOR"]) {
      if (previas[k] === undefined) delete process.env[k];
      else process.env[k] = previas[k];
    }
    await e?.cerrar();
  });

  it("ida y vuelta; lo guardado no contiene el dato en claro y cada cifrado es distinto", async () => {
    const c = crearCifradoDeCampos(ctx(tA), INVENTARIO);
    const dato = "Hipoacusia leve bilateral";
    const g1 = await c.cifrar("fichas_salud", "diagnostico", dato);
    const g2 = await c.cifrar("fichas_salud", "diagnostico", dato);
    expect(mod.estaCifrado(g1)).toBe(true);
    expect(g1).not.toContain("Hipoacusia");
    expect(g1).not.toBe(g2);
    expect(await c.descifrar("fichas_salud", "diagnostico", g1)).toBe(dato);
    expect(await c.descifrar("fichas_salud", "diagnostico", g2)).toBe(dato);
  });

  it("solo cifra lo que el inventario declara sensible (el RUT queda como está)", async () => {
    const c = crearCifradoDeCampos(ctx(tA), INVENTARIO);
    await expect(c.cifrar("personas", "rut", "11111111-1")).rejects.toThrow(/no está declarado como sensible/);
    await expect(c.cifrar("fichas_salud", "otro", "x")).rejects.toThrow(/no está declarado/);
    // El inventario real del Núcleo hoy no declara campos sensibles: nada se cifra por accidente.
    const real = mod.cifradoDeCampos(ctx(tA));
    await expect(real.cifrar("personas", "rut", "11111111-1")).rejects.toThrow();
  });

  it("el valor cifrado no se descifra en otro campo ni en otro tenant ni alterado", async () => {
    const a = crearCifradoDeCampos(ctx(tA), INVENTARIO);
    const g = await a.cifrar("fichas_salud", "diagnostico", "dato reservado");
    await expect(a.descifrar("fichas_salud", "huella", g)).rejects.toThrow(/No se pudo descifrar/);
    const b = crearCifradoDeCampos(ctx(tB), INVENTARIO);
    await expect(b.descifrar("fichas_salud", "diagnostico", g)).rejects.toThrow(/No se pudo descifrar/);
    const alterado = `${g.slice(0, -2)}${g.endsWith("AA") ? "BB" : "AA"}`;
    await expect(a.descifrar("fichas_salud", "diagnostico", alterado)).rejects.toThrow(/No se pudo descifrar/);
    await expect(a.descifrar("fichas_salud", "diagnostico", "en claro")).rejects.toThrow(/no está cifrado/);
    await expect(a.cifrar("fichas_salud", "diagnostico", g)).rejects.toThrow(/ya está cifrado/);
  });

  it("sigue legible tras rotar la KEK: la rotación recifra la DEK, no los datos", async () => {
    const dato = "Dato sensible de la persona";
    const g = await crearCifradoDeCampos(ctx(tA), INVENTARIO).cifrar("fichas_salud", "huella", dato);
    const v2 = randomBytes(32).toString("base64");
    // Lo que hace `rotar-kek` para este tenant (sin lanzar el script, que recorre TODOS los tenants
    // y chocaría con otros tests de base en paralelo): reenvolver la DEK con la KEK nueva.
    const fila = await e.admin.claveTenant.findUniqueOrThrow({ where: { tenantId: tA } });
    const dek = descifrar(Buffer.from(v1, "base64"), { cifrado: fila.dekCifrada, iv: fila.iv, tag: fila.tag });
    const nueva = cifrar(Buffer.from(v2, "base64"), dek);
    await e.admin.claveTenant.update({
      where: { tenantId: tA },
      data: { dekCifrada: Uint8Array.from(nueva.cifrado), iv: Uint8Array.from(nueva.iv), tag: Uint8Array.from(nueva.tag), kekVersion: 100 },
    });
    Object.assign(process.env, { OPAI_SECRETS_KEY: v2, OPAI_SECRETS_KEY_VERSION: "100" });
    delete process.env["OPAI_SECRETS_KEY_ANTERIOR"];
    expect(await crearCifradoDeCampos(ctx(tA), INVENTARIO).descifrar("fichas_salud", "huella", g)).toBe(dato);
  }, 60_000);

  it("el valor lleva el kid de la DEK y cifra también la cadena vacía (§21)", async () => {
    const c = crearCifradoDeCampos(ctx(tA), INVENTARIO);
    const g = await c.cifrar("fichas_salud", "diagnostico", "");
    expect(g).toMatch(/^enc:v2:[\w-]{11}:/);
    expect(await c.descifrar("fichas_salud", "diagnostico", g)).toBe("");
  });

  it("rotar la DEK recifra secretos y campos sensibles en una transacción (§22)", async () => {
    const { rotarDek } = await import("../src/core/cumplimiento/rotar-dek");
    const { leerSecreto } = await import("../src/integraciones/secretos");
    const r = await mod.executeCapability(ctx(tA), "core.integraciones.set_secreto", { proveedor: "resend", nombre: "api_key", valor: "re_rotar_123" });
    expect(r.ok ? null : r.error).toBeNull();
    const integracionId = (await e.admin.secreto.findFirstOrThrow({ where: { tenantId: tA } })).integracionId;
    const g = await crearCifradoDeCampos(ctx(tA), INVENTARIO).cifrar("fichas_salud", "diagnostico", "dato a rotar");
    // El inventario real no declara campos sensibles: un recifrador extra no se usa; la guarda exige
    // uno por cada campo declarado (hoy ninguno).
    const rot = await rotarDek(ctx(tA));
    expect(rot.secretos).toBe(1);
    expect(rot.kidAnterior).not.toBe(rot.kidNuevo);
    // Queda constancia en el outbox, en la misma transacción que la rotación.
    expect(await e.admin.evento.count({ where: { tenantId: tA, tipo: "core.cumplimiento.dek_rotada" } })).toBe(1);
    expect(await leerSecreto(ctx(tA), integracionId, "api_key")).toBe("re_rotar_123");
    // Lo cifrado con la DEK anterior ya no se lee (mismo error genérico): hay que recifrarlo al rotar.
    await expect(crearCifradoDeCampos(ctx(tA), INVENTARIO).descifrar("fichas_salud", "diagnostico", g)).rejects.toThrow(/No se pudo descifrar/);
    const fila = await e.admin.claveTenant.findUniqueOrThrow({ where: { tenantId: tA } });
    const nueva = descifrar(Buffer.from(process.env["OPAI_SECRETS_KEY"] ?? "", "base64"), { cifrado: fila.dekCifrada, iv: fila.iv, tag: fila.tag });
    expect(kidDe(nueva)).toBe(rot.kidNuevo);
    // Sin la DEK vieja ya no se puede recifrar: por eso la rotación recifra dentro de su transacción.
    expect(() => recifrarValor({ tenantId: tA, tabla: "fichas_salud", campo: "diagnostico" }, g, nueva, generarDekPrueba())).toThrow();
  }, 60_000);

  it("rotar la KEK y rotar la DEK cruzadas no guardan la DEK vieja (rev. 5689206639)", async () => {
    const { rotarDek } = await import("../src/core/cumplimiento/rotar-dek");
    const { reenvolverFila } = await import("../scripts/reenvolver-dek");
    const { leerSecreto } = await import("../src/integraciones/secretos");
    const integracionId = (await e.admin.secreto.findFirstOrThrow({ where: { tenantId: tA } })).integracionId;
    const kekA = () => Buffer.from(process.env["OPAI_SECRETS_KEY"] ?? "", "base64");
    const verA = () => Number(process.env["OPAI_SECRETS_KEY_VERSION"]);
    const usar = (kek: Buffer, version: number) =>
      Object.assign(process.env, { OPAI_SECRETS_KEY: kek.toString("base64"), OPAI_SECRETS_KEY_VERSION: String(version) });
    const fila = () => e.admin.claveTenant.findUniqueOrThrow({ where: { tenantId: tA } });
    const dekCon = (kek: Buffer, f: Awaited<ReturnType<typeof fila>>) => kidDe(descifrar(kek, { cifrado: f.dekCifrada, iv: f.iv, tag: f.tag }));

    // 1) Intercalado: `rotar-kek` lista la fila, `rotar-dek` reemplaza la DEK y recién entonces se reenvuelve.
    let anterior = kekA();
    let version = verA();
    let nueva = randomBytes(32);
    const { id } = await fila();
    await rotarDek(ctx(tA));
    const dekRotada = dekCon(anterior, await fila());
    expect(await reenvolverFila(e.admin, id, { actual: nueva, anterior, version: version + 1 })).toBe(true);
    expect(dekCon(nueva, await fila())).toBe(dekRotada); // la DEK nueva, no la que se listó
    usar(nueva, version + 1);
    expect(await leerSecreto(ctx(tA), integracionId, "api_key")).toBe("re_rotar_123");

    // 2) Concurrente: las dos rotaciones esperan el mismo bloqueo de fila y luego compiten.
    anterior = kekA();
    version = verA();
    nueva = randomBytes(32);
    let soltar: () => void = () => undefined;
    let tomado: () => void = () => undefined;
    const enEspera = new Promise<void>((r) => (soltar = r));
    const bloqueado = new Promise<void>((r) => (tomado = r));
    const bloqueo = e.admin.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.claves_tenant WHERE id = ${id}::uuid FOR UPDATE`;
      tomado();
      await enEspera;
    }, { timeout: 30_000 });
    await bloqueado;
    const carrera = Promise.allSettled([
      rotarDek(ctx(tA)),
      reenvolverFila(e.admin, id, { actual: nueva, anterior, version: version + 1 }),
    ]);
    await new Promise((r) => setTimeout(r, 300));
    soltar();
    await bloqueo;
    const [dek, kek] = await carrera;
    // El reenvolvido siempre ocurre (antes o después de la DEK nueva); `rotar-dek` puede fallar
    // cerrado si llega después (la DEK ya está con la KEK nueva), pero nunca deja la DEK vieja.
    expect(kek).toEqual({ status: "fulfilled", value: true });
    if (dek.status === "fulfilled") expect(dekCon(nueva, await fila())).toBe(dek.value.kidNuevo);
    usar(nueva, version + 1);
    expect(await leerSecreto(ctx(tA), integracionId, "api_key")).toBe("re_rotar_123");
  }, 60_000);
});
