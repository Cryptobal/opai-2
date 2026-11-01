import { Building2, Plus } from "lucide-react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { Buscador } from "@/app/_components/maestros/buscador";
import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { rut } from "@/lib/fechas";

import type { Proveedor } from "../../../_componentes/tipos";

const dias = (p: Proveedor) => `${p.plazoPagoDias} días`;
const Estado = ({ p }: { p: Proveedor }) => (
  <Badge tono={p.activo ? "success" : "neutro"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
);

/** Lista de proveedores (02): RUT, plazo de pago y estado. */
export function ListaProveedores(p: {
  state: EstadoPantalla;
  items: Proveedor[];
  gestiona: boolean;
  filtrado: boolean;
}) {
  return (
    <ListScreen<Proveedor>
      state={p.state}
      titulo="Proveedores"
      {...(p.gestiona
        ? { accionPrincipal: <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>Nuevo proveedor</EnlaceBotonHoja> }
        : {})}
      buscador={<Buscador placeholder="Buscar por nombre o RUT" />}
      filtros={
        <ChipsFiltro
          filtros={[{ param: "estado", etiqueta: "Estado", opciones: [{ valor: "todos", etiqueta: "Incluir inactivos" }] }]}
        />
      }
      items={p.items}
      clave={(x) => x.id}
      href={(x) => `/finanzas/compras/proveedores/${x.id}`}
      Link={LinkNext}
      textos={{
        vacio: p.filtrado
          ? { titulo: "Ningún proveedor coincide", descripcion: "Prueba con otro nombre o RUT." }
          : { titulo: "Aún no hay proveedores", descripcion: "Crea el primero para registrar sus documentos en el libro de compras." },
      }}
      tarjeta={(x) => (
        <>
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{x.razonSocial}</span>
            <span className="text-sm text-fg-muted">
              <span className="t-mono">{rut(x.rut)}</span> · {dias(x)}
            </span>
          </span>
          <Estado p={x} />
        </>
      )}
      columnas={[
        { id: "n", etiqueta: "Proveedor", render: (x) => <span className="font-medium">{x.razonSocial}</span> },
        { id: "r", etiqueta: "RUT", className: "t-mono", render: (x) => rut(x.rut) },
        { id: "pl", etiqueta: "Plazo de pago", render: dias },
        { id: "e", etiqueta: "Estado", render: (x) => <Estado p={x} /> },
      ]}
    />
  );
}
