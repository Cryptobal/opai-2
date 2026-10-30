// Portal Trabajador PR 1 contra Postgres real (si hay DATABASE_URL_TEST): dos empresas, RLS con el rol
// sin BYPASSRLS. Prueba que un trabajador lee y edita solo su propia persona (no la de un compañero ni
// la de otra empresa), que la vista previa no persiste, que no se puede tocar lo que es de RR.HH.
// (nombre, RUT, correo laboral), que las preferencias son por persona y empresa y que sin elección rige
// el silencio por defecto.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { manifest } from "../../../modules/portal_trabajador/manifest";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Datos = {
  personaId: string;
  nombres: string;
  rut: string;
  emailLaboral: string | null;
  telefono: string | null;
  emailPersonal: string | null;
  direccionFormateada: string | null;
  lat: number | null;
  faltantes: string[];
};
type Preferencias = {
  preferencias: Record<string, { push: boolean; correo: boolean }>;
  silencio: { desde: string; hasta: string } | null;
  personalizadas: boolean;
};

describe.skipIf(!urlPropietario)("portal trabajador en base real: persona propia y preferencias", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { a1: "", a2: "", b1: "", sinPersona: "" };
  const p = { a1: "", a2: "", b1: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...manifest.capacidades]);
    const sufijo = randomUUID().slice(0, 8);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${sufijo}`, nombre: slug, vertical: "seguridad" } })).id;
    t.a = await tenant("pt-a");
    t.b = await tenant("pt-b");
    const usuario = async (clave: keyof typeof u) => {
      const id = randomUUID();
      await e.admin.user.create({ data: { id, name: clave, email: `${clave}-${sufijo}@prueba.cl` } });
      u[clave] = id;
    };
    for (const clave of ["a1", "a2", "b1", "sinPersona"] as const) await usuario(clave);
    // `core.personas.usuario_id` exige una membresía del mismo tenant: se siembran las tres.
    for (const [tenantId, userId] of [[t.a, u.a1], [t.a, u.a2], [t.b, u.b1]] as const)
      await e.admin.membership.create({
        data: { tenantId, userId, rol: "viewer", portales: ["trabajador"], estado: "activa" },
      });
    const persona = (tenantId: string, usuarioId: string, rut: string, nombres: string) =>
      e.admin.persona
        .create({ data: { tenantId, usuarioId, rut, nombres, apellidos: "Prueba", emailLaboral: `${nombres}@gard.test` } })
        .then((x) => x.id);
    p.a1 = await persona(t.a, u.a1, "11111111-1", "Ana");
    p.a2 = await persona(t.a, u.a2, "22222222-2", "Beto");
    p.b1 = await persona(t.b, u.b1, "33333333-3", "Carla");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, usuarioId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      portal: "trabajador",
      portalesMembresia: ["trabajador"],
      modulosActivos: ["portal_trabajador"],
      rol: "viewer",
      medidor: { registrar: async () => undefined },
    });
  const correr = (tenantId: string, usuarioId: string, id: string, input: unknown = {}, dryRun = false) =>
    mod.executeCapability(ctx(tenantId, usuarioId), id, input, { dryRun });
  async function dato<T>(tenantId: string, usuarioId: string, id: string, input: unknown = {}, dryRun = false): Promise<T> {
    const r = await correr(tenantId, usuarioId, id, input, dryRun);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("cada trabajador lee solo su propia ficha, aunque haya otros en la misma empresa", async () => {
    const a1 = await dato<Datos>(t.a, u.a1, "portal_trabajador.mis_datos.obtener");
    const a2 = await dato<Datos>(t.a, u.a2, "portal_trabajador.mis_datos.obtener");
    expect(a1).toMatchObject({ personaId: p.a1, nombres: "Ana", rut: "11111111-1" });
    expect(a2).toMatchObject({ personaId: p.a2, nombres: "Beto" });
    expect(a1.faltantes).toEqual(["telefono", "emailPersonal", "direccion"]);
  });

  it("no hay forma de apuntar a otra persona: el input no admite ids y un campo extra no cambia el alcance", async () => {
    const r = await correr(t.a, u.a1, "portal_trabajador.mis_datos.actualizar", { telefono: "+56 9 1111 2222", personaId: p.a2 });
    expect(r.ok).toBe(true);
    const a2 = await dato<Datos>(t.a, u.a2, "portal_trabajador.mis_datos.obtener");
    expect(a2.telefono).toBeNull();
    expect((await dato<Datos>(t.a, u.a1, "portal_trabajador.mis_datos.obtener")).telefono).toBe("+56911112222");
  });

  it("un usuario de la empresa B no ve ni edita la ficha de la A; sin persona vinculada es NOT_FOUND", async () => {
    // El usuario de B, operando en B, solo ve a Carla.
    expect((await dato<Datos>(t.b, u.b1, "portal_trabajador.mis_datos.obtener")).personaId).toBe(p.b1);
    // Operando en A con un usuario que allí no tiene persona: no hay ficha que mostrar (RLS + vínculo).
    const r = await correr(t.a, u.b1, "portal_trabajador.mis_datos.obtener");
    expect(r.ok ? "OK" : r.error.code).toBe("NOT_FOUND");
    const w = await correr(t.a, u.sinPersona, "portal_trabajador.mis_datos.actualizar", { telefono: "+56988887777" });
    expect(w.ok ? "OK" : w.error.code).toBe("NOT_FOUND");
    expect((await e.admin.persona.findUnique({ where: { id: p.a1 } }))?.telefono).toBe("+56911112222");
  });

  it("la vista previa no persiste y muestra el resultado", async () => {
    const previa = await dato<Datos>(t.a, u.a1, "portal_trabajador.mis_datos.actualizar", { emailPersonal: "ana@correo.cl" }, true);
    expect(previa.emailPersonal).toBe("ana@correo.cl");
    expect((await e.admin.persona.findUnique({ where: { id: p.a1 } }))?.emailPersonal).toBeNull();
  });

  it("guarda la dirección con coordenadas, deja evento y no toca nombre, RUT ni correo laboral", async () => {
    const r = await dato<Datos>(t.a, u.a1, "portal_trabajador.mis_datos.actualizar", {
      emailPersonal: "ana@correo.cl",
      direccion: {
        direccionFormateada: "Av. Apoquindo 4500, Las Condes",
        calle: "Av. Apoquindo 4500",
        comuna: "Las Condes",
        region: "Metropolitana",
        placeId: "lugar-ficticio",
        lat: -33.41,
        lng: -70.58,
      },
    });
    expect(r).toMatchObject({ emailPersonal: "ana@correo.cl", direccionFormateada: "Av. Apoquindo 4500, Las Condes", lat: -33.41, nombres: "Ana", rut: "11111111-1", emailLaboral: "Ana@gard.test" });
    expect(r.faltantes).toEqual([]);
    const evento = await e.admin.evento.findFirst({
      where: { tenantId: t.a, tipo: "portal_trabajador.mis_datos.actualizados" },
      orderBy: { createdAt: "desc" },
    });
    expect(evento).not.toBeNull();
    // El evento lleva los nombres de los campos cambiados, nunca sus valores.
    expect(JSON.stringify(evento?.payload)).toContain("direccionFormateada");
    expect(JSON.stringify(evento?.payload)).not.toContain("Apoquindo");
  });

  it("rechaza coordenadas incompletas o fuera de rango, un correo inválido y un cambio vacío", async () => {
    const mal = async (input: unknown) => (await correr(t.a, u.a1, "portal_trabajador.mis_datos.actualizar", input)).ok;
    expect(await mal({ direccion: { direccionFormateada: "X 1", lat: -33 } })).toBe(false);
    expect(await mal({ direccion: { direccionFormateada: "X 1", lat: 95, lng: 0 } })).toBe(false);
    expect(await mal({ emailPersonal: "no-es-correo" })).toBe(false);
    expect(await mal({})).toBe(false);
  });

  it("una persona archivada o anonimizada responde como inexistente", async () => {
    await e.admin.persona.update({ where: { id: p.a2 }, data: { archivadaEn: new Date() } });
    const r = await correr(t.a, u.a2, "portal_trabajador.mis_datos.obtener");
    expect(r.ok ? "OK" : r.error.code).toBe("NOT_FOUND");
  });

  it("sin elección, las preferencias son el silencio por defecto; luego se guardan por persona", async () => {
    const base = await dato<Preferencias>(t.a, u.a1, "portal_trabajador.preferencias_notificacion.obtener");
    expect(base.personalizadas).toBe(false);
    expect(Object.values(base.preferencias).every((c) => !c.push && !c.correo)).toBe(true);
    const previa = await dato<Preferencias>(
      t.a, u.a1, "portal_trabajador.preferencias_notificacion.actualizar", { preferencias: { pauta: { push: true } } }, true,
    );
    expect(previa.preferencias["pauta"]?.push).toBe(true);
    expect((await dato<Preferencias>(t.a, u.a1, "portal_trabajador.preferencias_notificacion.obtener")).personalizadas).toBe(false);

    await dato(t.a, u.a1, "portal_trabajador.preferencias_notificacion.actualizar", {
      preferencias: { pauta: { push: true }, documentos: { correo: true } },
      silencio: { desde: "22:00", hasta: "07:00" },
    });
    // Un segundo cambio parcial conserva lo anterior.
    const final = await dato<Preferencias>(t.a, u.a1, "portal_trabajador.preferencias_notificacion.actualizar", { preferencias: { pauta: { correo: true } } });
    expect(final.preferencias["pauta"]).toEqual({ push: true, correo: true });
    expect(final.preferencias["documentos"]).toEqual({ push: false, correo: true });
    expect(final.silencio).toEqual({ desde: "22:00", hasta: "07:00" });
    const quitado = await dato<Preferencias>(t.a, u.a1, "portal_trabajador.preferencias_notificacion.actualizar", { silencio: null });
    expect(quitado.silencio).toBeNull();
  });

  it("las preferencias de un compañero y de otra empresa no se ven ni se mezclan", async () => {
    await dato(t.a, u.a1, "portal_trabajador.preferencias_notificacion.actualizar", { preferencias: { central: { push: true } } });
    const delCompanero = await correr(t.a, u.a2, "portal_trabajador.preferencias_notificacion.obtener");
    expect(delCompanero.ok ? "OK" : delCompanero.error.code).toBe("NOT_FOUND"); // a2 está archivada: no hay ficha
    const deB = await dato<Preferencias>(t.b, u.b1, "portal_trabajador.preferencias_notificacion.obtener");
    expect(deB.personalizadas).toBe(false);
    expect(deB.preferencias["central"]?.push).toBe(false);
    // Tampoco con el rol de aplicación directo: sin tenant fijado, la RLS no devuelve filas.
    expect(await e.appSinTenant.preferenciaNotificacion.count().catch(() => 0)).toBe(0);
    const propias = await e.forTenant(t.b).preferenciaNotificacion.findMany();
    expect(propias).toHaveLength(0);
  });

  it("un tenant sin el módulo activo no puede usar las capacidades", async () => {
    const sin = mod.crearContexto({
      tenantId: t.a,
      actor: { tipo: "user", id: u.a1 },
      portal: "trabajador",
      portalesMembresia: ["trabajador"],
      modulosActivos: [],
      rol: "viewer",
    });
    const r = await mod.executeCapability(sin, "portal_trabajador.mis_datos.obtener", {}, {});
    expect(r.ok ? "OK" : r.error.code).toBe("FORBIDDEN");
  });

  it("desde el portal ERP la capacidad no está disponible (solo portal trabajador)", async () => {
    const erp = mod.crearContexto({
      tenantId: t.a,
      actor: { tipo: "user", id: u.a1 },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["portal_trabajador"],
      rol: "owner",
    });
    const r = await mod.executeCapability(erp, "portal_trabajador.mis_datos.obtener", {}, {});
    expect(r.ok ? "OK" : r.error.code).toBe("FORBIDDEN");
  });
});
