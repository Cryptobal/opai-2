import { Plus } from "lucide-react";

import { Badge, ChipsEtiquetas, type EstadoPantalla } from "@opai/ds";

import { filtroDeEtiquetas, type OpcionEtiqueta } from "@/app/_components/etiquetas/opciones";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";

import { HojaContacto } from "../../cuentas/_componentes/diferidas";
import type { ContactoFila } from "./datos";
import { metaContactosLista, nucleoFilaContacto } from "./fila-contacto-lista";

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
        meta={metaContactosLista(p.items)}
        seleccionada={p.seleccionado}
        vacio={{
          titulo: "Aún no hay contactos",
          descripcion: p.gestionar
            ? "Agrega el primero eligiendo su cuenta, o desde la ficha de la cuenta."
            : "Los contactos se agregan desde la ficha de su cuenta.",
          ...(nuevo ? { accion: nuevo } : {}),
        }}
        filas={p.items.map((c) => {
          const { contactoMovil, ...fila } = nucleoFilaContacto(c, p.q);
          return {
            ...fila,
            terciario: (
              <>
                {contactoMovil}
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
          };
        })}
      />
      {p.gestionar ? <HojaContacto contactos={[]} /> : null}
    </>
  );
}
