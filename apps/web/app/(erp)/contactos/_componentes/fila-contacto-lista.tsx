import { Avatar } from "@opai/ds";

import { telefono } from "@/lib/fechas";
import { conBusqueda } from "@/lib/parametros";

import type { ContactoFila } from "./datos";

/** Campos comunes de una fila en las listas de contactos (pantalla completa y split). */
export function nucleoFilaContacto(c: ContactoFila, q?: string) {
  return {
    id: c.id,
    href: conBusqueda(`/contactos/${c.id}`, q),
    inicio: <Avatar nombre={c.nombre} size="lg" />,
    titulo: c.nombre,
    secundario: [c.cuentaNombre, c.cargo].filter(Boolean).join(" · "),
    contactoMovil: (
      <span className="md:hidden">
        {[c.email, c.telefono ? telefono(c.telefono) : null].filter(Boolean).join(" · ")}
      </span>
    ),
  };
}

export function metaContactosLista(items: ContactoFila[]) {
  const principales = items.filter((c) => c.esPrincipal).length;
  return {
    izquierda: `${items.length} contactos · ${principales} ${principales === 1 ? "principal" : "principales"}`,
    derecha: "Apellido A–Z",
  };
}