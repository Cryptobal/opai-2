// Brief 07c · B3 (bloqueante de autorrevisión): `core.estructuras.create` y `core.estructuras.anular`
// no filtraban las escrituras por el alcance de instalaciones del actor (solo las lecturas lo hacían).
// Fail-closed: fuera de alcance = NOT_FOUND, igual que una lectura (sin distinguir "no existe" de
// "no es tuyo", ADR-022 §16.4).
import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function preparar() {
  const owner = contextoDePrueba();
  const cargoId = (await dato<{ id: string }>(owner.ctx, "core.cargos.create", { nombre: "Guardia" }))
    .id;
  const cuentaId = (await dato<{ id: string }>(owner.ctx, "core.cuentas.create", { nombre: "Cuenta" }))
    .id;
  const instalacionDentro = (
    await dato<{ id: string }>(owner.ctx, "core.instalaciones.create", {
      cuentaId,
      nombre: "Planta a cargo",
    })
  ).id;
  const instalacionFuera = (
    await dato<{ id: string }>(owner.ctx, "core.instalaciones.create", {
      cuentaId,
      nombre: "Planta ajena",
    })
  ).id;
  const puesto = (instalacionId: string, nombre: string) =>
    dato<{ id: string }>(owner.ctx, "core.puestos.create", {
      instalacionId,
      cargoId,
      nombre,
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "08:00",
      horaFin: "20:00",
    });
  const puestoDentro = (await puesto(instalacionDentro, "Día a cargo")).id;
  const puestoFuera = (await puesto(instalacionFuera, "Día ajeno")).id;
  const personaId = (
    await dato<{ id: string }>(owner.ctx, "core.personas.create", {
      nombres: "Pedro",
      apellidos: "Soto",
      rut: "19.876.543-0",
    })
  ).id;
  // Mismo rol y los mismos permisos del owner (ve todo), pero con alcance acotado a una sola
  // instalación: aísla el efecto del alcance del efecto de los permisos (ADR-022: son dimensiones
  // distintas).
  const acotado = { ...owner.ctx, alcance: { instalaciones: [instalacionDentro] } };
  return { ...owner, cargoId, puestoDentro, puestoFuera, personaId, acotado };
}

describe("alcance en escrituras de core.estructuras.* (B3)", () => {
  it("no puede crear una estructura de un puesto fuera de su alcance", async () => {
    const { acotado, puestoFuera } = await preparar();
    expect(
      await codigo(acotado, "core.estructuras.create", {
        nivel: "puesto",
        puestoId: puestoFuera,
        sueldoBase: 1,
        vigenteDesde: "2026-01-01",
      }),
    ).toBe("NOT_FOUND");
  });

  it("sí puede crear y anular una estructura de un puesto dentro de su alcance", async () => {
    const { acotado, puestoDentro } = await preparar();
    const creada = await dato<{ id: string; estado: string }>(
      acotado,
      "core.estructuras.create",
      { nivel: "puesto", puestoId: puestoDentro, sueldoBase: 100, vigenteDesde: "2026-01-01" },
    );
    expect(creada.estado).toBe("vigente");
    const anulada = await dato(acotado, "core.estructuras.anular", {
      id: creada.id,
      motivo: "Prueba de alcance",
    });
    expect(anulada).toMatchObject({ estado: "anulada" });
  });

  it("no puede anular una estructura de un puesto fuera de su alcance", async () => {
    const { ctx, acotado, puestoFuera } = await preparar();
    const deOtro = await dato<{ id: string }>(ctx, "core.estructuras.create", {
      nivel: "puesto",
      puestoId: puestoFuera,
      sueldoBase: 100,
      vigenteDesde: "2026-01-01",
    });
    expect(
      await codigo(acotado, "core.estructuras.anular", { id: deOtro.id, motivo: "Intento ajeno" }),
    ).toBe("NOT_FOUND");
  });

  it("no puede crear ni editar una estructura por persona (07b pendiente): negación total", async () => {
    const { acotado, personaId } = await preparar();
    expect(
      await codigo(acotado, "core.estructuras.create", {
        nivel: "persona",
        personaId,
        sueldoBase: 100,
        vigenteDesde: "2026-01-01",
        motivo: "Excepción por persona",
      }),
    ).toBe("NOT_FOUND");
  });

  it("fuera de alcance y no existente devuelven el mismo error (sin enumeración)", async () => {
    const { acotado, puestoFuera } = await preparar();
    const fuera = await codigo(acotado, "core.estructuras.create", {
      nivel: "puesto",
      puestoId: puestoFuera,
      sueldoBase: 1,
      vigenteDesde: "2026-01-01",
    });
    const inexistente = await codigo(acotado, "core.estructuras.create", {
      nivel: "puesto",
      puestoId: "0192f3a0-0000-7000-8000-00000000ff99",
      sueldoBase: 1,
      vigenteDesde: "2026-01-01",
    });
    expect(fuera).toBe("NOT_FOUND");
    expect(inexistente).toBe("NOT_FOUND");
  });

  it("concurrencia: ninguna escritura paralela fuera de alcance se escapa del filtro", async () => {
    const { acotado, puestoFuera } = await preparar();
    const resultados = await Promise.all(
      Array.from({ length: 5 }, () =>
        codigo(acotado, "core.estructuras.create", {
          nivel: "puesto",
          puestoId: puestoFuera,
          sueldoBase: 1,
          vigenteDesde: "2026-01-01",
        }),
      ),
    );
    expect(resultados).toEqual(Array(5).fill("NOT_FOUND"));
  });
});
