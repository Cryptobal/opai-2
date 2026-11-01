import { GRUPOS_IDS } from "@/app/(erp)/configuracion/_centro/grupos";

import { ejecutarComoUsuario } from "./servidor";
import { type Coleccion, type Consulta, consultaDeRuta } from "./existencia-ruta";

type Evento = { evento: string };
type Integracion = { estado: string };

// Ids literales (no dinámicos): el gate de paridad los verifica contra el registro de capacidades.
const LEER = {
  personas: (id: string) => ejecutarComoUsuario("erp", "core.personas.get", { id }),
  cuentas: (id: string) => ejecutarComoUsuario("erp", "core.cuentas.get", { id }),
  instalaciones: (id: string) => ejecutarComoUsuario("erp", "core.instalaciones.get", { id }),
  cargos: (id: string) => ejecutarComoUsuario("erp", "core.cargos.get", { id }),
  agentes: (id: string) => ejecutarComoUsuario("erp", "core.apikeys.get", { id }),
  "terreno-instalaciones": (id: string) =>
    ejecutarComoUsuario("supervisor", "core.instalaciones.get", { id }),
  "terreno-personas": (id: string) => ejecutarComoUsuario("supervisor", "core.personas.get", { id }),
} satisfies Record<Coleccion, (id: string) => Promise<{ ok: boolean; error?: { code: string } }>>;

// «Sin alcance» se responde igual que «no existe» (ADR-022): el 404 no revela que la ficha existe.
const OCULTA = new Set(["NOT_FOUND", "FORBIDDEN"]);

/**
 * ¿Existe lo que la ruta pide? Solo responde `false` cuando la base dice que no (NOT_FOUND o FORBIDDEN por alcance, evento
 * fuera del catálogo, integración «próximamente»); sin sesión o ante un fallo, `true`: la página
 * decide y el proxy no esconde nada por un error pasajero.
 */
export async function existeRuta(pathname: string): Promise<boolean> {
  const q: Consulta | null = consultaDeRuta(pathname);
  if (!q) return true;
  if (q.tipo === "ficha") {
    const r = await LEER[q.coleccion](q.id);
    return r.ok || !OCULTA.has(r.error?.code ?? "");
  }
  if (q.tipo === "evento") {
    const r = await ejecutarComoUsuario<Evento[]>("erp", "core.comunicaciones.eventos", {});
    return !r.ok || r.data.some((x) => x.evento === q.evento);
  }
  // Grupo de Configuración: lista cerrada y estática, sin tocar la base (brief §4.2).
  if (q.tipo === "grupo") return (GRUPOS_IDS as readonly string[]).includes(q.grupo);
  if (q.proveedor === "ia") return true;
  const r = await ejecutarComoUsuario<Integracion>("erp", "core.integraciones.get", {
    proveedor: q.proveedor,
  });
  return r.ok ? r.data.estado !== "proximamente" : r.error.code !== "NOT_FOUND";
}
