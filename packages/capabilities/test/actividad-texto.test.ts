import { beforeEach, expect, it } from "vitest";

import {
  capacidadesComercial,
  capacidadesDelNucleo,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { capacidadesDeCambios, frase } from "../src/core/panel/actividad-texto";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesComercial]);
});

it("traduce acciones de personas y agentes con el mismo diccionario", () => {
  expect(frase("core.instalaciones.create", {})).toBe("creó la instalación");
  expect(frase("comercial.negocios.update", {})).toBe("actualizó el negocio");
  expect(frase("platform.modules.set", {})).toBe("cambió los módulos activos");
});

it("usa un respaldo español sin revelar fragmentos de ids desconocidos", () => {
  expect(frase("future.widgets.unknown_action", {})).toBe("realizó un cambio");
  expect(frase("future.widgets.update", {})).toBe("realizó un cambio");
  expect(frase("core.instalaciones.list", {})).toBe("consultó información");
});

it("selecciona cambios desde el efecto del registro, también por prefijo", () => {
  const cambios = capacidadesDeCambios();
  expect(cambios).toContain("core.instalaciones.create");
  expect(cambios).toContain("comercial.negocios.create");
  for (const id of [
    "core.instalaciones.list",
    "core.instalaciones.get",
    "comercial.negocios.embudo",
  ])
    expect(cambios).not.toContain(id);
  expect(capacidadesDeCambios("core.instalaciones")).toContain("core.instalaciones.update");
  expect(capacidadesDeCambios("inexistente")).toEqual([]);
});

it("dice qué se hizo y sobre qué en las acciones de todos los módulos (CAR-339)", () => {
  expect(frase("core.users.invite", { email: "ana@empresa.test" })).toBe(
    "invitó a ana@empresa.test",
  );
  expect(frase("cpq.cotizaciones.aprobar", {})).toBe("aprobó la cotización");
  expect(frase("comercial.solicitudes.convertir", { empresa: "Minera Sur" })).toBe(
    "convirtió la solicitud Minera Sur",
  );
  expect(frase("core.anexos.rechazar", {})).toBe("rechazó el anexo");
});

it("sin verbo conocido nombra la ficha, y sin ficha conocida nombra el módulo", () => {
  expect(frase("cpq.cotizaciones.margen", {})).toBe("modificó la cotización");
  expect(frase("finanzas.zzz.aprobar", {})).toBe("aprobó un registro de Finanzas");
  expect(frase("finanzas.zzz.zzz", {})).toBe("realizó un cambio en Finanzas");
});
