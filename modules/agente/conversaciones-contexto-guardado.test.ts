import { beforeEach, expect, it, vi } from "vitest";
import {
  capacidadesComercial,
  capacidadesDelNucleo,
  limpiarRegistro,
  obtenerCapacidad,
  registrarCapacidades,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";

import { FICHA } from "./conversaciones-contexto";
import { validarContextoAlGuardar } from "./conversaciones-contexto-guardado";

const ID = "00000000-0000-4000-8000-0000000000cc";
beforeEach(() => {
  limpiarRegistro();
  const ids = new Set<string>(Object.values(FICHA));
  registrarCapacidades(
    [...capacidadesDelNucleo, ...capacidadesComercial].filter((c) => ids.has(c.id)),
  );
});

function contexto() {
  const { ctx } = contextoDePrueba({
    modulosActivos: ["agente", "comercial"],
    alcance: { instalaciones: [ID] },
  });
  const inesperado = vi.fn(() => {
    throw new Error("No debe abrir conexiones ni medir el guard");
  });
  ctx.transaccion = inesperado;
  ctx.enLectura = inesperado;
  ctx.medidor = { registrar: inesperado, preparar: inesperado };
  return { ctx, inesperado };
}

it.each([
  ["cuenta", "cuenta", { instalaciones: { some: { id: { in: [ID] } } } }],
  ["instalacion", "instalacion", { id: { in: [ID] } }],
  [
    "persona",
    "persona",
    { vinculos: { some: { estado: "vigente", instalacionId: { in: [ID] } } } },
  ],
] as const)(
  "%s usa filtro compartido y devuelve solo existencia",
  async (tipo, modelo, alcance) => {
    const { ctx, inesperado } = contexto();
    const consultar = vi.spyOn(ctx.db[modelo], "findFirst").mockResolvedValue({ id: ID } as never);
    expect(await validarContextoAlGuardar(ctx, { tipo, id: ID })).toBeUndefined();
    expect(consultar).toHaveBeenCalledWith({
      where: { id: ID, AND: [alcance] },
      select: { id: true },
    });
    expect(inesperado).not.toHaveBeenCalled();
  },
);

it("negocio conserva el contrato de negocioDe: ID bajo RLS sin inventar alcance", async () => {
  const { ctx, inesperado } = contexto();
  const consultar = vi.spyOn(ctx.db.negocio, "findUnique").mockResolvedValue({ id: ID } as never);
  await validarContextoAlGuardar(ctx, { tipo: "negocio", id: ID });
  expect(consultar).toHaveBeenCalledWith({ where: { id: ID }, select: { id: true } });
  expect(inesperado).not.toHaveBeenCalled();
});

it.each(["registro ausente", "efecto cambiado", "sin permiso", "portal", "scope", "módulo"])(
  "%s deniega antes de consultar, sin enumerar la ficha",
  async (caso) => {
    const { ctx } = contexto();
    const consultar = vi.spyOn(ctx.db.negocio, "findUnique");
    if (caso === "registro ausente") limpiarRegistro();
    if (caso === "efecto cambiado") {
      const original = obtenerCapacidad(FICHA.negocio)!;
      limpiarRegistro();
      registrarCapacidades([{ ...original, efecto: "escritura" }]);
    }
    if (caso === "sin permiso") ctx.autorizar = () => false;
    if (caso === "portal") ctx.portal = "trabajador";
    if (caso === "scope") ctx.scopes = ["otro"];
    if (caso === "módulo") ctx.modulosActivos = ["agente"];
    await expect(validarContextoAlGuardar(ctx, { tipo: "negocio", id: ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(consultar).not.toHaveBeenCalled();
  },
);

it("respeta permisos alternos declarados en el registro", async () => {
  const { ctx } = contexto();
  const original = obtenerCapacidad(FICHA.negocio)!;
  limpiarRegistro();
  registrarCapacidades([{ ...original, permisosAlternos: ["comercial:alterno"] }]);
  ctx.autorizar = (p) => p === "comercial:alterno";
  vi.spyOn(ctx.db.negocio, "findUnique").mockResolvedValue({ id: ID } as never);
  await expect(validarContextoAlGuardar(ctx, { tipo: "negocio", id: ID })).resolves.toBeUndefined();
});

it("ficha inexistente o fuera de alcance falla cerrado; fallo DB no se oculta", async () => {
  const { ctx } = contexto();
  const consultar = vi.spyOn(ctx.db.persona, "findFirst").mockResolvedValue(null);
  await expect(validarContextoAlGuardar(ctx, { tipo: "persona", id: ID })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  const error = new Error("DB de prueba no disponible");
  consultar.mockRejectedValue(error);
  await expect(validarContextoAlGuardar(ctx, { tipo: "persona", id: ID })).rejects.toBe(error);
});
