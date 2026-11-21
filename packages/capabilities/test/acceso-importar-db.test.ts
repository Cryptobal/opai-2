// CAR-480: importar listas de acceso desde Excel por el motor común, contra Postgres real (rol sin BYPASSRLS).
import { escribirExcel } from "@opai/domain/importacion";
import { digitoVerificador, formatearRut, normalizarDocumento } from "@opai/domain";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { prepararAccesoAB } from "./acceso-entorno-a-b";

type Resultado = {
  conteos: Record<string, number>;
  filas: { fila: number; accion: string; mensajes: string[] }[];
  importacionId: string | null;
};
const COLUMNAS = ["Instalación", "Lista", "RUT", "Nombre", "Motivo"];

function runUnico(sufijo: string, base: number): string {
  const extra = parseInt(sufijo.replace(/\D/g, "").slice(0, 6) || "0", 16) % 500_000;
  const cuerpo = String(base + extra);
  return formatearRut(`${cuerpo}-${digitoVerificador(cuerpo)}`);
}

function runMalDigito(runValido: string): string {
  const rut = normalizarDocumento({ tipo: "run", numero: runValido });
  if (!rut) throw new Error("RUN de prueba inválido");
  const [cuerpo, dv] = rut.clave.split("-") as [string, string];
  const mal = dv === "2" ? "3" : "2";
  return formatearRut(`${cuerpo}-${mal}`);
}

describe.skipIf(!urlPropietario)("importar listas de acceso en base real (CAR-480)", () => {
  let x: Awaited<ReturnType<typeof prepararAccesoAB>>;
  let runOk = "";
  let runBloqueo = "";
  let runOtraSede = "";
  let mascaraOk = "";

  async function importar(k: "A" | "B", filas: string[][], dryRun = false, extra = {}) {
    const bytes = await escribirExcel("Listas", COLUMNAS, filas);
    const input = {
      importador: "acceso_listas",
      archivo: { nombre: "listas.xlsx", contenidoBase64: Buffer.from(bytes).toString("base64") },
      ...extra,
    };
    const r = await x.mod.executeCapability(x.ctx(k), "core.importar.ejecutar", input, { dryRun });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Resultado;
  }

  beforeAll(async () => {
    x = await prepararAccesoAB();
    runOk = runUnico(x.sufijo, 14_000_000);
    runBloqueo = runUnico(`${x.sufijo}-bloq`, 22_000_000);
    runOtraSede = runUnico(`${x.sufijo}-otr`, 33_000_000);
    const doc = normalizarDocumento({ tipo: "run", numero: runOk });
    if (!doc) throw new Error("RUN de prueba inválido");
    mascaraOk = doc.mascara;
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await x?.e?.cerrar?.();
  });

  it("la vista previa marca los errores por fila sin guardar ni revelar el número", async () => {
    const r = await importar(
      "A",
      [
        ["Portería A", "autorizada", runOk, "Visita Uno", ""],
        ["Portería A", "autorizada", runMalDigito(runOk), "Mal dígito", ""],
        ["Portería A", "bloqueada", runBloqueo, "Sin motivo", ""],
        ["No existe", "autorizada", runOtraSede, "Otra sede", ""],
        ["Portería A", "autorizado", runOk.replace(/\./g, ""), "Repetida", ""],
      ],
      true,
    );
    expect(r.conteos).toMatchObject({ crear: 1, error: 4 });
    expect(r.filas.map((f) => f.accion)).toEqual(["crear", "error", "error", "error", "error"]);
    expect(JSON.stringify(r)).not.toContain(runOk.replace(/[.-]/g, "").slice(0, 6));
    expect(await x.e.forTenant(x.t.A).entradaLista.count()).toBe(0);
  });

  it("guarda solo huella y máscara, no duplica al repetir y se revierte", async () => {
    const filas = [["Portería A", "bloqueada", runOk, "Visita Uno", "Prueba"]];
    const r = await importar("A", filas);
    expect(r.conteos).toMatchObject({ crear: 1 });
    const [e] = await x.e.forTenant(x.t.A).entradaLista.findMany();
    expect(e).toMatchObject({ tipo: "bloqueada", docTipo: "run", mascara: mascaraOk });
    const lote = await x.e.admin.importacionFila.findMany({ where: { tenantId: x.t.A } });
    expect(JSON.stringify(lote)).not.toContain(runOk.replace(/[.-]/g, "").slice(0, 6));
    expect((await importar("A", filas)).conteos).toMatchObject({ sin_cambio: 1, crear: 0 });
    const otra = [["Portería A", "bloqueada", runOk, "Visita Uno", "Otro motivo"]];
    expect((await importar("A", otra, false, { alExistir: "sobrescribir" })).conteos).toMatchObject(
      { actualizar: 1 },
    );
    expect((await x.e.forTenant(x.t.A).entradaLista.findFirst())?.motivo).toBe("Otro motivo");
    if (!r.importacionId) throw new Error("sin lote");
    const rev = await x.ok<{ revertido: boolean }>("A", "core.importar.revertir", {
      importacionId: r.importacionId,
    });
    expect(rev.revertido).toBe(true);
  });

  it("otra empresa no ve las instalaciones de A ni escribe en sus listas", async () => {
    const r = await importar("B", [["Portería A", "autorizada", runOk, "X", ""]]);
    expect(r.filas[0]?.mensajes).toEqual(["No existe la instalación «Portería A»."]);
    expect(await x.e.forTenant(x.t.B).entradaLista.count()).toBe(0);
  });
});