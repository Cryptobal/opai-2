import { Avatar, Badge, type EstadoPantalla } from "@opai/ds";

import { ListaMaestroSplit } from "@/app/_components/maestros/lista-maestro-split";
import { telefono } from "@/lib/fechas";
import { conBusqueda } from "@/lib/parametros";

import type { ContactoFila } from "./datos";

/** Columna izquierda en la ficha dividida: sin buscador (volver a la bandeja para filtrar). */
export function ListaContactosSplit(p: {
  state: EstadoPantalla;
  items: ContactoFila[];
  seleccionado?: string;
  q?: string | undefined;
}) {
  const principales = p.items.filter((c) => c.esPrincipal).length;
  return (
    <ListaMaestroSplit
      state={p.state}
      titulo="Contactos"
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
