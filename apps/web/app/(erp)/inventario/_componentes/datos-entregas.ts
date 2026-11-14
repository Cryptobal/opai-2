import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { conCursor as c, sinTildes, todas } from "./paginas";
import type { Activo, Entrega, Opcion, Prenda } from "./tipos";

export async function cargarEntregas(p: Parametros) {
  const estado = p["estado"] === "devueltas" || p["estado"] === "todas" ? p["estado"] : "abiertas";
  const { r, items } = await todas<Entrega>(
    (cursor) => ejecutarComoUsuario("erp", "inventario.entregas.list", { estado, limite: 200, ...c(cursor) }),
    25,
  );
  // Búsqueda por lo entregado o por quién lo tiene.
  const q = sinTildes(p["q"] ?? "");
  const visibles = q ? items.filter((x) => sinTildes(`${x.item} ${x.destino}`).includes(q)) : items;
  return { state: estadoPantalla(r), items: visibles, estado };
}

/** Opciones de la hoja «Nueva entrega»: solo se cargan con la hoja abierta (ADR-045). */
export async function cargarOpcionesEntrega() {
  type PersonaFila = { id: string; nombres: string; apellidos: string };
  const [activos, ropa, personas, instalaciones] = await Promise.all([
    todas<Activo>((cursor) => ejecutarComoUsuario("erp", "inventario.activos.list", { estado: "disponible", limite: 200, ...c(cursor) }), 5),
    todas<Prenda>((cursor) => ejecutarComoUsuario("erp", "inventario.ropa.list", { limite: 200, ...c(cursor) }), 2),
    todas<PersonaFila>((cursor) => ejecutarComoUsuario("erp", "core.personas.list", { estado: "activa", limite: 100, ...c(cursor) }), 10),
    todas<{ id: string; nombre: string }>((cursor) => ejecutarComoUsuario("erp", "core.instalaciones.list", { limite: 100, ...c(cursor) }), 10),
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
