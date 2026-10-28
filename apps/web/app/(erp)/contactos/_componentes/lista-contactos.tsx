import { Avatar, Badge, type EstadoPantalla } from "@opai/ds";

import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { telefono } from "@/lib/fechas";
import { conBusqueda } from "@/lib/parametros";

import type { ContactoFila } from "./datos";

/** Columna de contactos (como Personas): avatar, nombre, "cuenta · correo · teléfono" y principal. */
export function ListaContactos(p: {
  state: EstadoPantalla;
  items: ContactoFila[];
  seleccionado?: string;
  q?: string | undefined;
}) {
  const principales = p.items.filter((c) => c.esPrincipal).length;
  return (
    <ListaMaestro
      state={p.state}
      titulo="Contactos"
      buscar="Buscar por nombre o correo"
      filtros={[
        { param: "principales", etiqueta: "Principales", opciones: [{ valor: "si", etiqueta: "Sí" }] },
      ]}
      meta={{
        izquierda: `${p.items.length} contactos · ${principales} ${principales === 1 ? "principal" : "principales"}`,
        derecha: "Apellido A–Z",
      }}
      seleccionada={p.seleccionado}
      vacio={{
        titulo: "Aún no hay contactos",
        descripcion: "Los contactos se agregan desde la ficha de su cuenta.",
      }}
      filas={p.items.map((c) => ({
        id: c.id,
        href: conBusqueda(`/contactos/${c.id}`, p.q),
        inicio: <Avatar nombre={c.nombre} size="lg" />,
        titulo: c.nombre,
        secundario: [c.cuentaNombre, c.cargo].filter(Boolean).join(" · "),
        terciario: (
          <span className="md:hidden">
            {[c.email, c.telefono ? telefono(c.telefono) : null].filter(Boolean).join(" · ")}
          </span>
        ),
        fin: c.esPrincipal ? (
          <Badge punto={false} className="hidden md:inline-flex">
            Principal
          </Badge>
        ) : undefined,
      }))}
    />
  );
}
