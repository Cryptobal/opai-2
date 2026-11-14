import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Activo, Entrega, Opcion, Prenda } from "./tipos";

type Pagina<T> = { items: T[]; siguiente: string | null };
type Respuesta<T> = { ok: true; data: Pagina<T> } | { ok: false };
const c = (cursor: string | null) => (cursor ? { cursor } : {});

/** Recorre una lista por cursor hasta `maxPaginas`; `pedir` llama a la capacidad con su id literal. */
async function todas<T>(pedir: (cursor: string | null) => Promise<Respuesta<T>>, maxPaginas: number) {
  const items: T[] = [];
  let cursor: string | null = null;
  let ok = true;
  for (let i = 0; i < maxPaginas; i++) {
    const r = await pedir(cursor);
    if (!r.ok) {
      ok = i > 0;
      break;
    }
    items.push(...r.data.items);
    cursor = r.data.siguiente;
    if (!cursor) break;
  }
  return { ok, items };
}

export async function cargarEntregas(p: Parametros) {
  const estado = p["estado"] === "devueltas" || p["estado"] === "todas" ? p["estado"] : "abiertas";
  const r = await todas<Entrega>(
    (cursor) => ejecutarComoUsuario("erp", "inventario.entregas.list", { estado, limite: 200, ...c(cursor) }),
    25,
  );
  return { state: estadoPantalla(r.ok ? { ok: true } : { ok: false, error: { code: "INTERNAL" } }), items: r.items, estado };
}

/** Opciones de la hoja «Nueva entrega»: solo se cargan con la hoja abierta (ADR-045). */
export async function cargarOpcionesEntrega() {
  type PersonaFila = { id: string; nombres: string; apellidos: string };
  const [activos, ropa, personas, instalaciones] = await Promise.all([
    todas<Activo>((cursor) => ejecutarComoUsuario("erp", "inventario.activos.list", { estado: "disponible", limite: 200, ...c(cursor) }), 5),
    todas<Prenda>((cursor) => ejecutarComoUsuario("erp", "inventario.ropa.list", { limite: 200, ...c(cursor) }), 2),
    todas<PersonaFila>((cursor) => ejecutarComoUsuario("erp", "core.personas.list", { estado: "activa", limite: 100, ...c(cursor) }), 3),
    todas<{ id: string; nombre: string }>((cursor) => ejecutarComoUsuario("erp", "core.instalaciones.list", { limite: 100, ...c(cursor) }), 3),
  ]);
  const destinos: Opcion[] = [
    ...personas.items.map((x) => ({ valor: `persona:${x.id}`, etiqueta: `${x.nombres} ${x.apellidos}`, detalle: "Persona" })),
    ...instalaciones.items.map((x) => ({ valor: `instalacion:${x.id}`, etiqueta: x.nombre, detalle: "Instalación" })),
  ];
  return {
    activos: activos.items.map((a) => ({ valor: a.id, etiqueta: a.codigo, detalle: a.tipo })),
    ropa: ropa.items,
    destinos,
  };
}
