import { Badge, type EstadoPantalla } from "@opai/ds";

import { ListaMaestroSplit } from "@/app/_components/maestros/lista-maestro-split";

import type { ContactoFila } from "./datos";
import { metaContactosLista, nucleoFilaContacto } from "./fila-contacto-lista";

/** Columna izquierda en la ficha dividida: sin buscador (volver a la bandeja para filtrar). */
export function ListaContactosSplit(p: {
  state: EstadoPantalla;
  items: ContactoFila[];
  seleccionado?: string;
  q?: string | undefined;
}) {
  return (
    <ListaMaestroSplit
      state={p.state}
      titulo="Contactos"
      meta={metaContactosLista(p.items)}
      seleccionada={p.seleccionado}
      vacio={{
        titulo: "Aún no hay contactos",
        descripcion: "Los contactos se agregan desde la ficha de su cuenta.",
      }}
      filas={p.items.map((c) => {
        const { contactoMovil, ...fila } = nucleoFilaContacto(c, p.q);
        return {
          ...fila,
          terciario: contactoMovil,
          fin: c.esPrincipal ? (
            <Badge punto={false} className="hidden md:inline-flex">
              Principal
            </Badge>
          ) : undefined,
        };
      })}
    />
  );
}
