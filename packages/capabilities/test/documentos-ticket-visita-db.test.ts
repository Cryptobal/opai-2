// CAR-496: adjuntos a tickets y visitas de supervisión vía core.documentos (ADR-019).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest as manifestPauta } from "../../../modules/pauta/manifest";
import { manifest as manifestTickets } from "../../../modules/tickets/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as Mod from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

describe.skipIf(omitirSuiteDb())("documentos · ticket y visita (CAR-496)", () => {
  let e: Entorno, mod: typeof Mod;
  const almacen = almacenamientoEnMemoria();
  const t = { a: "" };
  const u = { ger: randomUUID(), ajeno: randomUUID(), sup: randomUUID() };
  const inst: Record<string, string> = {};
  let tipoTicket = "";
  let tipoVisita = "";
  let tipoIdTicket = "";

  const base = (uid: string, rol: "gerente" | "supervisor", instalaciones?: string[]) =>
    mod.crearContexto({
      ...(instalaciones ? { alcance: { instalaciones } } : {}),
      tenantId: t.a,
      actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@doc496.test`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["tickets", "pauta"],
      medidor: { registrar: async () => undefined },
      servicios: { almacenamiento: almacen.almacenamiento },
    });

  const run = async <T,>(c: ReturnType<typeof base>, cap: string, input: unknown): Promise<T> => {
    const r = await mod.executeCapability(c, cap, input, {});
    if (!r.ok) throw new Error(`${cap}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };

  const SHA = "a".repeat(64);

  const subirA = async (
    c: ReturnType<typeof base>,
    entidad: { tipo: "ticket" | "visita"; id: string },
    tipoDoc: string,
  ) => {
    const sha256 = SHA;
    const ini = await run<{ documento: { id: string } }>(c, "core.documentos.iniciar_subida", {
      entidad,
      tipoId: tipoDoc,
      nombre: "adjunto.pdf",
      mime: "application/pdf",
      tamano: 10,
      sha256,
    });
    const fila = await e.admin.documento.findUniqueOrThrow({ where: { id: ini.documento.id } });
    almacen.subir(fila.storageKey, 10, "application/pdf", sha256);
    await run(c, "core.documentos.confirmar_subida", { id: fila.id });
    return fila.id;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifestTickets, manifestPauta]);
    t.a = (
      await e.admin.tenant.create({
        data: { slug: `qa-doc496-${randomUUID().slice(0, 8)}`, nombre: "Doc496", vertical: "seguridad" },
      })
    ).id;
    for (const [id, rol] of [
      [u.ger, "gerente"],
      [u.ajeno, "gerente"],
      [u.sup, "supervisor"],
    ] as const) {
      await e.admin.user.create({ data: { id, name: `U ${id.slice(0, 4)}`, email: `${id.slice(0, 8)}@doc496.test` } });
      await e.admin.membership.create({ data: { tenantId: t.a, userId: id, rol, portales: ["erp"] } });
    }
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cliente" } })).id;
    for (const k of ["norte", "sur"] as const) {
      inst[k] = (await e.admin.instalacion.create({ data: { tenantId: t.a, cuentaId, nombre: k } })).id;
    }
    tipoIdTicket = (
      await e.admin.tipoTicket.create({
        data: {
          tenantId: t.a,
          nombre: "Soporte",
          responsableDefectoTipo: "usuario",
          responsableDefectoUsuarioId: u.ger,
        },
      })
    ).id;
    const c0 = base(u.ger, "gerente");
    tipoTicket = (
      await run<{ id: string }>(c0, "core.documento_tipos.create", {
        codigo: "adj_ticket",
        capa: "ticket",
        nombre: "Adjunto ticket",
        tieneVencimiento: false,
      })
    ).id;
    tipoVisita = (
      await run<{ id: string }>(c0, "core.documento_tipos.create", {
        codigo: "adj_visita",
        capa: "visita",
        nombre: "Foto visita",
        tieneVencimiento: false,
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("sube a un ticket visible; otro usuario sin rol en el ticket no lo lista", async () => {
    const cGer = base(u.ger, "gerente");
    const ticketId = (
      await run<{ id: string }>(cGer, "tickets.tickets.crear", {
        tipoId: tipoIdTicket,
        titulo: "Falla eléctrica",
        descripcion: "Sin luz",
      })
    ).id;
    await subirA(cGer, { tipo: "ticket", id: ticketId }, tipoTicket);
    const ajeno = await mod.executeCapability(
      base(u.ajeno, "gerente"),
      "core.documentos.list",
      { entidad: { tipo: "ticket", id: ticketId } },
      {},
    );
    if (!ajeno.ok) throw new Error(JSON.stringify(ajeno.error));
    expect((ajeno.data as { items: unknown[] }).items).toEqual([]);
    const propio = await run<{ items: unknown[] }>(cGer, "core.documentos.list", {
      entidad: { tipo: "ticket", id: ticketId },
    });
    expect(propio.items).toHaveLength(1);
  });

  it("sube a una visita dentro del alcance del supervisor", async () => {
    const cSup = base(u.sup, "supervisor", [inst["norte"]!]);
    const visitaId = (await run<{ visita: { id: string } }>(cSup, "pauta.visitas.iniciar", { instalacionId: inst["norte"] }))
      .visita.id;
    await run(cSup, "pauta.visitas.cerrar", { visitaId, checklist: [] });
    await subirA(cSup, { tipo: "visita", id: visitaId }, tipoVisita);
    const dentro = await run<{ items: unknown[] }>(cSup, "core.documentos.list", {
      entidad: { tipo: "visita", id: visitaId },
    });
    expect(dentro.items).toHaveLength(1);
    const fuera = await mod.executeCapability(
      base(u.sup, "supervisor", [inst["sur"]!]),
      "core.documentos.list",
      { entidad: { tipo: "visita", id: visitaId } },
      {},
    );
    if (!fuera.ok) throw new Error(JSON.stringify(fuera.error));
    expect((fuera.data as { items: unknown[] }).items).toEqual([]);
  });
});