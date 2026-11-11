// Entorno compartido de las pruebas del importador (CAR-279): dos empresas con Comercial sembrado.
import { randomUUID } from "node:crypto";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

export type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
export type Salida = {
  simulacion: boolean; bloqueos: string[]; totalFilas: number; siguiente: number | null; importacionId: string | null;
  conteos: { crear: number; actualizar: number; sin_cambio: number; error: number };
  filas: { fila: number; accion: string; etiqueta: string; mensajes: string[]; cambios: string[] }[];
  mapeo: Record<string, string | null>; columnasIgnoradas: string[];
};
type Rol = "owner" | "admin" | "gerente" | "supervisor";

export async function entornoImportar() {
  const e: Entorno = await prepararEntorno();
  const mod: typeof ModuloCapacidades = await import("../src");
  mod.limpiarRegistro();
  mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
  registrarModuloComercial();
  const usuario = randomUUID();
  await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@importar.test`, name: "Ana Importa", emailVerified: true } });
  const tenants: string[] = [];
  for (const n of ["a", "b"]) {
    const t = await e.admin.tenant.create({ data: { slug: `imp-${n}-${randomUUID().slice(0, 8)}`, nombre: `Empresa ${n}`, vertical: "seguridad" } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    await e.admin.membership.create({ data: { tenantId: t.id, userId: usuario, rol: "owner", estado: "activa", portales: ["erp"] } });
    tenants.push(t.id);
  }
  const medidor = { registrar: async () => undefined };
  const run = <T>(tenantId: string, id: string, input: unknown, o: { rol?: Rol; dryRun?: boolean; modulos?: string[] } = {}) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId, actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana Importa", email: "ana@importar.test", platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol: o.rol ?? "owner", modulosActivos: o.modulos ?? ["comercial"], medidor,
      }),
      id, input, { dryRun: o.dryRun ?? false },
    ) as Promise<Res<T>>;
  const csv = (texto: string, nombre = "datos.csv") => ({ nombre, contenidoBase64: Buffer.from(texto, "utf8").toString("base64") });
  /** Importa (o simula) y devuelve la salida; falla la prueba si la capacidad responde con error. */
  const importar = async (t: string, importador: string, extra: Record<string, unknown>, dryRun = false): Promise<Salida> => {
    const r = await run<Salida>(t, "core.importar.ejecutar", { importador, ...extra }, { dryRun });
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data;
  };
  return { e, mod, usuario, t1: tenants[0] ?? "", t2: tenants[1] ?? "", run, csv, importar };
}
