import { beforeEach, describe, expect, it, vi } from "vitest";

const ejecutar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: ejecutar }));

import { buscarCandidatosDocumento } from "@/app/_acciones/candidatos-documento";
import { textoDestino } from "@/app/_components/documentos/campo-vincular";
import { CAPA_DE_ENTIDAD } from "@/app/_components/documentos/tipos";

beforeEach(() => ejecutar.mockReset());

const persona = {
  id: "p1",
  nombres: "Ana",
  apellidos: "Rojas",
  nombreCompleto: "Ana Rojas",
  rut: "19.876.543-0",
  emailPersonal: "ana@example.test",
  telefono: "+56912345678",
  fechaNacimiento: "1990-01-01",
};

describe("candidatos de «Vincular a»", () => {
  it("personas: solo id y nombre, sin RUT ni otros datos personales", async () => {
    ejecutar.mockResolvedValue({ ok: true, data: { items: [persona], siguiente: null } });
    const r = await buscarCandidatosDocumento({ tipo: "persona", q: "ana" });
    expect(r).toEqual({ ok: true, items: [{ id: "p1", etiqueta: "Rojas, Ana" }] });
    expect(JSON.stringify(r)).not.toMatch(/19\.876|ana@|\+569|1990/);
    expect(ejecutar).toHaveBeenCalledWith("erp", "core.personas.list", { limite: 20, q: "ana" });
  });

  it("usa la capacidad de cada entidad, acota a 20 y deja la instalación con su cuenta", async () => {
    const filas = Array.from({ length: 30 }, (_, i) => ({
      id: `i${i}`,
      nombre: `Sitio ${i}`,
      cuenta: "Andina",
    }));
    ejecutar.mockResolvedValue({ ok: true, data: { items: filas, siguiente: null } });
    const r = await buscarCandidatosDocumento({ tipo: "instalacion", q: "" });
    expect(ejecutar).toHaveBeenCalledWith("erp", "core.instalaciones.list", { limite: 20 });
    expect(r.ok && r.items).toHaveLength(20);
    expect(r.ok && r.items[0]).toEqual({ id: "i0", etiqueta: "Sitio 0", detalle: "Andina" });
    ejecutar.mockResolvedValue({
      ok: true,
      data: { items: [{ id: "c1", nombre: "Andina", rut: "76.000.000-0" }] },
    });
    expect(await buscarCandidatosDocumento({ tipo: "cuenta", q: "an" })).toEqual({
      ok: true,
      items: [{ id: "c1", etiqueta: "Andina" }],
    });
    expect(ejecutar).toHaveBeenLastCalledWith("erp", "core.cuentas.list", { limite: 20, q: "an" });
  });

  it("errores: sin permiso y caída sin detalles internos; entrada inválida no consulta", async () => {
    ejecutar.mockResolvedValue({ ok: false, error: { code: "FORBIDDEN", message: "x" } });
    expect(await buscarCandidatosDocumento({ tipo: "cuenta", q: "" })).toEqual({
      ok: false,
      mensaje: "No tienes permiso para ver esta lista.",
    });
    ejecutar.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "pg: boom (ref: 1)" },
    });
    expect(await buscarCandidatosDocumento({ tipo: "persona", q: "" })).toEqual({
      ok: false,
      mensaje: "No se pudo buscar. Reintenta en unos segundos.",
    });
    ejecutar.mockClear();
    // @ts-expect-error entrada fuera del contrato (la acción es pública)
    expect((await buscarCandidatosDocumento({ tipo: "puesto", q: "" })).ok).toBe(false);
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("el texto de destino refleja la elección", () => {
    const e = {
      tenant: "Empresa",
      cuenta: "Cuenta",
      instalacion: "Instalación",
      persona: "Persona",
    };
    expect(textoDestino({ tipo: "tenant", id: "t", nombre: null }, e)).toBe(
      "Se guarda en los documentos de la empresa.",
    );
    expect(textoDestino({ tipo: "persona", id: null, nombre: null }, e)).toContain("Elige a qué");
    expect(textoDestino({ tipo: "cuenta", id: "c", nombre: "Andina" }, e)).toBe(
      "Se guarda en los documentos de cuenta Andina.",
    );
    expect(Object.keys(CAPA_DE_ENTIDAD)).toEqual(["tenant", "cuenta", "instalacion", "persona"]);
  });
});
