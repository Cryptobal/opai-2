import { Plus } from "lucide-react";

import { Avatar, Badge, ChipsEtiquetas, type EstadoPantalla } from "@opai/ds";

import { filtroDeEtiquetas, type OpcionEtiqueta } from "@/app/_components/etiquetas/opciones";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { telefono } from "@/lib/fechas";
import { conBusqueda } from "@/lib/parametros";

import { HojaContacto } from "../../cuentas/_componentes/diferidas";
import type { ContactoFila } from "./datos";

/** Columna de contactos (como Personas): avatar, nombre, "cuenta · correo · teléfono" y principal. */
export function ListaContactos(p: {
  state: EstadoPantalla;
  items: ContactoFila[];
  seleccionado?: string;
  q?: string | undefined;
  etiquetas?: OpcionEtiqueta[];
  /** Puede crear contactos (CAR-337): alta directa eligiendo la cuenta. */
  gestionar?: boolean;
}) {
  const principales = p.items.filter((c) => c.esPrincipal).length;
  const nuevo = p.gestionar ? (
    <EnlaceBotonHoja
      href={`/contactos?${p.q ? `q=${encodeURIComponent(p.q)}&` : ""}contacto=nuevo`}
      icono={Plus}
    >
      Nuevo
    </EnlaceBotonHoja>
  ) : null;
  return (
    <>
      <ListaMaestro
        state={p.state}
        titulo="Contactos"
        accion={nuevo}
        buscar="Buscar por nombre o correo"
        filtros={[
          {
            param: "principales",
            etiqueta: "Principales",
            opciones: [{ valor: "si", etiqueta: "Sí" }],
          },
          {
            param: "archivados",
            etiqueta: "Archivados",
            opciones: [{ valor: "si", etiqueta: "Incluir" }],
          },
          ...filtroDeEtiquetas(p.etiquetas ?? []),
        ]}
        meta={{
          izquierda: `${p.items.length} contactos · ${principales} ${principales === 1 ? "principal" : "principales"}`,
          derecha: "Apellido A–Z",
        }}
        seleccionada={p.seleccionado}
        vacio={{
          titulo: "Aún no hay contactos",
          descripcion: p.gestionar
            ? "Agrega el primero eligiendo su cuenta, o desde la ficha de la cuenta."
            : "Los contactos se agregan desde la ficha de su cuenta.",
          ...(nuevo ? { accion: nuevo } : {}),
        }}
        filas={p.items.map((c) => ({
          id: c.id,
          href: conBusqueda(`/contactos/${c.id}`, p.q),
          inicio: <Avatar nombre={c.nombre} size="lg" />,
          titulo: c.nombre,
          secundario: [c.cuentaNombre, c.cargo].filter(Boolean).join(" · "),
          terciario: (
            <>
              <span className="md:hidden">
                {[c.email, c.telefono ? telefono(c.telefono) : null].filter(Boolean).join(" · ")}
              </span>
              <ChipsEtiquetas compacto etiquetas={c.etiquetas} className="mt-1" />
            </>
          ),
          fin: c.archivado ? (
            <Badge punto={false}>Archivado</Badge>
          ) : c.esPrincipal ? (
            <Badge punto={false} className="hidden md:inline-flex">
              Principal
            </Badge>
          ) : undefined,
        }))}
      />
      {p.gestionar ? <HojaContacto contactos={[]} /> : null}
    </>
  );
}
