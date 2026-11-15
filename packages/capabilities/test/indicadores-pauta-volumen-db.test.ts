import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { dato } from "./maestros-ayuda";

// Volumen de los indicadores de Pauta (riesgo anotado en CAR-322): 300 instalaciones con 5 puestos cada una y
// serie 4x4 todo el mes, repartidas entre 50 supervisores. Medir cobertura, turnos descubiertos y turnos extra
// (lo que hace el cierre de mes por cada indicador) tiene que caber con margen en el tope de una transacción.
const INSTALACIONES = 300;
const PUESTOS = 5;
const SUPERVISORES = 50;
const INDICADORES = ["pauta.cobertura", "pauta.turnos_descubiertos", "pauta.turnos_extra"];

describe.skipIf(!urlPropietario)("indicadores de Pauta con volumen (Postgres real)", () => {
  let e: Entorno;
  let a = "";
  let dueno = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = () =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "user", id: dueno },
      usuario: { id: dueno, nombre: "dueño", email: `d-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["pauta"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    registrarModulos([
      defineModule({
        id: "pauta",
        nombre: "Pauta",
        version: "0.1.0",
        dependencias: [],
        permisos: [{ id: "pauta:read", descripcion: "Ver la pauta" }],
        navegacion: [],
        configuracion: mod.ajustesPauta,
        eventos: [],
        capacidades: [],
        indicadores: mod.indicadoresPauta,
      }),
    ]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    a = (
      await e.admin.tenant.create({
        data: {
          slug: `volp-${sufijo}`,
          nombre: "volp",
          vertical: "seguridad",
          timezone: "America/Santiago",
        },
      })
    ).id;
    dueno = (
      await e.admin.user.create({
        data: { name: "dueño", email: `d-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: a, userId: dueno, rol: "owner", portales: ["erp"] },
    });
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cliente" } })).id;
    const cargoId = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Guardia" } })).id;
    const patronId = (
      await e.admin.patronTurno.create({
        data: { tenantId: a, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 },
      })
    ).id;
    const instalaciones = Array.from({ length: INSTALACIONES }, (_, i) => ({
      id: randomUUID(),
      tenantId: a,
      cuentaId,
      nombre: `Instalación ${i}`,
    }));
    await e.admin.instalacion.createMany({ data: instalaciones });
    const puestos = instalaciones.flatMap((inst) =>
      Array.from({ length: PUESTOS }, (_, j) => ({
        id: randomUUID(),
        tenantId: a,
        instalacionId: inst.id,
        cargoId,
        nombre: `Puesto ${j}`,
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: j % 2 ? "20:00" : "08:00",
        horaFin: j % 2 ? "08:00" : "20:00",
      })),
    );
    await e.admin.puesto.createMany({ data: puestos });
    await e.admin.seriePauta.createMany({
      data: puestos.map((p, i) => ({
        tenantId: a,
        puestoId: p.id,
        patronId,
        inicioCiclo: new Date(`2026-10-0${(i % 8) + 1}`),
        vigenteDesde: new Date("2026-10-01"),
      })),
    });
    const usuarios = Array.from({ length: SUPERVISORES }, (_, i) => ({
      id: randomUUID(),
      name: `s${i}`,
      email: `s${i}-${sufijo}@prueba.cl`,
      emailVerified: true,
    }));
    await e.admin.user.createMany({ data: usuarios });
    const membresias = usuarios.map((u) => ({
      id: randomUUID(),
      tenantId: a,
      userId: u.id,
      rol: "supervisor",
      portales: ["erp"],
    }));
    await e.admin.membership.createMany({ data: membresias });
    await e.admin.supervisorInstalacion.createMany({
      data: instalaciones.map((inst, i) => ({
        tenantId: a,
        membershipId: membresias[i % SUPERVISORES]?.id ?? "",
        instalacionId: inst.id,
      })),
    });
  }, 300_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it(`mide los 3 indicadores de ${INSTALACIONES} instalaciones en menos de 10 s`, async () => {
    type Salida = { mediciones: { sujetoId: string; valor: number | null }[] };
    const t0 = performance.now();
    const salidas: Salida[] = [];
    for (const indicador of INDICADORES)
      salidas.push(
        await dato<Salida>(ctx(), "core.indicadores_gestion.medir", {
          indicador,
          periodo: "2026-10",
        }),
      );
    const ms = performance.now() - t0;
    console.info(
      `[volumen] ${INDICADORES.length} indicadores de Pauta, ${INSTALACIONES * PUESTOS} puestos, en ${Math.round(ms)} ms`,
    );
    const [cobertura, descubiertos] = salidas;
    expect(cobertura?.mediciones).toHaveLength(SUPERVISORES);
    // Ninguna serie tiene titular: todo turno programado del mes queda por cubrir.
    expect(cobertura?.mediciones.every((m) => m.valor === 0)).toBe(true);
    expect(descubiertos?.mediciones.every((m) => (m.valor ?? 0) > 0)).toBe(true);
    expect(ms).toBeLessThan(10_000);
  }, 120_000);
});
