// Entorno de las pruebas de Accesos en el Portal Cliente (CAR-481): dos empresas; en A las cuentas X e Y, cada una
// con su contacto. El contacto de X solo ve su primera instalación; los de Y y B ven todas las de su cuenta.
import { randomUUID } from "node:crypto";
import { vi } from "vitest";

import { manifest as manifestAcceso } from "../../../modules/acceso/manifest";
import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { limpiarModulos, registrarModulos } from "../src/module";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type Contacto = "X" | "Y" | "B";

export async function entornoPortalAccesos() {
  vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
  const e: Entorno = await prepararEntorno();
  const mod: typeof ModuloCapacidades = await import("../src");
  mod.limpiarRegistro();
  mod.registrarCapacidades(mod.capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos([manifestAcceso]);
  const s = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };
  const tenant = async (k: string) =>
    (await e.admin.tenant.create({ data: { slug: `apc-${k}-${s}`, nombre: k, vertical: "seguridad" } })).id;
  const t = { A: await tenant("a"), B: await tenant("b") };
  const cuenta = async (tenantId: string, nombre: string) =>
    (await e.admin.cuenta.create({ data: { tenantId, nombre } })).id;
  const cuentas = { X: await cuenta(t.A, "Cuenta X"), Y: await cuenta(t.A, "Cuenta Y"), B: await cuenta(t.B, "Cuenta B") };
  const disp: Record<string, string> = {};
  const instalacion = async (tenantId: string, cuentaId: string, nombre: string) => {
    const id = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa" } })).id;
    disp[id] = (
      await e.admin.dispositivo.create({
        data: { tenantId, instalacionId: id, identificador: `DSP-${nombre}`, estado: "activo", tokenHash: `h-${s}-${nombre}` },
      })
    ).id;
    return id;
  };
  const inst = {
    X1: await instalacion(t.A, cuentas.X, "Planta X1"),
    X2: await instalacion(t.A, cuentas.X, "Bodega X2"),
    Y: await instalacion(t.A, cuentas.Y, "Torre Y"),
    B: await instalacion(t.B, cuentas.B, "Planta B"),
  };
  const usuarios = { X: randomUUID(), Y: randomUUID(), B: randomUUID() };
  const tenantDe = (k: Contacto) => (k === "B" ? t.B : t.A);
  for (const k of ["X", "Y", "B"] as const) {
    await e.admin.user.create({ data: { id: usuarios[k], name: `Contacto ${k}`, email: `apc-${k}-${s}@prueba.cl` } });
    const m = await e.admin.membership.create({
      data: { tenantId: tenantDe(k), userId: usuarios[k], rol: "viewer", portales: ["cliente"] },
    });
    await e.admin.accesoCliente.create({
      data: {
        tenantId: tenantDe(k),
        membershipId: m.id,
        cuentaId: cuentas[k],
        todasInstalaciones: k !== "X",
        ...(k === "X" ? { instalaciones: { create: { tenantId: t.A, instalacionId: inst.X1 } } } : {}),
      },
    });
  }

  await Promise.all(
    (["X", "Y", "B"] as const).map((k) =>
      e.admin.configPortalCuenta.create({
        data: {
          tenantId: tenantDe(k),
          cuentaId: cuentas[k],
          seccionesVisibles: ["accesos"],
          gestionaListas: true,
        },
      }),
    ),
  );

  const sistema = (tenantId: string) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", alcance: null, medidor, modulosActivos: ["acceso"] });
  const contacto = (k: Contacto, modulosActivos = ["acceso", "portal_cliente"]) =>
    mod.crearContexto({
      tenantId: tenantDe(k),
      actor: { tipo: "user", id: usuarios[k] },
      usuario: { id: usuarios[k], nombre: `Contacto ${k}`, email: `apc-${k}-${s}@prueba.cl`, platformRole: null },
      rol: "viewer",
      permisosRol: ["portal_cliente:read"],
      portal: "cliente",
      portalesMembresia: ["cliente"],
      modulosActivos,
      medidor,
    });
  const run = <T>(c: ReturnType<typeof sistema>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o) as Promise<Res<T>>;
  const ok = async <T>(c: ReturnType<typeof sistema>, id: string, input: unknown, o = {}) => {
    const r = await run<T>(c, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  };
  /** Entrada registrada por la portería de la instalación (sin salida: queda en sitio). */
  const entrada = (tenantId: string, instalacionId: string, nombre: string) =>
    ok(sistema(tenantId), "core.hechos_terreno.recibir", {
      dispositivoId: disp[instalacionId],
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave: randomUUID(),
          tipo: "acceso.entrada",
          payload: { tipoRegistro: "vehiculo", documento: { tipo: "run", numero: "12.345.678-5" }, nombre, patente: "AB-CD 12" },
          horaHecho: new Date(Date.now() - 10_000).toISOString(),
        },
      ],
    });

  return { e, t, cuentas, inst, usuarios, sistema, contacto, run, ok, entrada };
}
