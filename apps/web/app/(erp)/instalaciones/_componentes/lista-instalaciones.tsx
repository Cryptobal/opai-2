import { MapPin, Plus } from "lucide-react";

import { Badge, cn, type EstadoPantalla } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ESTADO_INSTALACION, estadoDe } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { conBusqueda } from "@/lib/parametros";
import type { InstalacionFila } from "@/lib/tipos-maestros";

import { REGIONES } from "./datos";

type Props = {
  state: EstadoPantalla;
  items: InstalacionFila[];
  cuentas: { valor: string; etiqueta: string }[];
  titulo: string;
  singular: string;
  seleccionada?: string;
  /** Búsqueda vigente: se conserva al abrir una ficha y al volver. */
  q?: string | undefined;
};

const personas = (n: number) => `${n} ${n === 1 ? "persona" : "personas"}`;

/** Columna de instalaciones (06): icono, nombre, "cuenta · comuna", estado y dotación. */
export function ListaInstalaciones(p: Props) {
  const total = p.items.reduce((t, i) => t + i.dotacion, 0);
  const nueva = (
    <EnlaceBoton href="/instalaciones/nueva" icono={Plus} className="md:hidden">
      Nueva
    </EnlaceBoton>
  );
  return (
    <ListaMaestro
      state={p.state}
      titulo={p.titulo}
      accion={nueva}
      buscar={`Buscar ${p.singular}`}
      filtros={[
        { param: "cuenta", etiqueta: "Cuenta", opciones: p.cuentas },
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: Object.entries(ESTADO_INSTALACION).map(([valor, e]) => ({
            valor,
            etiqueta: e.etiqueta,
          })),
        },
        { param: "region", etiqueta: "Región", opciones: REGIONES },
      ]}
      meta={{ izquierda: `${p.items.length} ${p.titulo.toLowerCase()}`, derecha: personas(total) }}
      seleccionada={p.seleccionada}
      vacio={{
        titulo: `Aún no hay ${p.titulo.toLowerCase()}`,
        descripcion: "Crea la primera para definir sus puestos y documentos.",
        accion: nueva,
      }}
      filas={p.items.map((i) => {
        const e = estadoDe(ESTADO_INSTALACION, i.estado);
        const sel = p.seleccionada === i.id;
        return {
          id: i.id,
          href: conBusqueda(`/instalaciones/${i.id}`, p.q),
          inicio: (
            <span
              aria-hidden
              className={cn(
                "flex size-9 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted",
                sel && "bg-surface text-accent shadow-[inset_0_0_0_1px_var(--ds-accent)]",
              )}
            >
              <MapPin className="size-4" />
            </span>
          ),
          titulo: i.nombre,
          secundario: [i.cuenta, i.comuna].filter(Boolean).join(" · "),
          fin: (
            <>
              <Badge tono={e.tono}>{e.etiqueta}</Badge>
              <span className="t-caption hidden md:block">{personas(i.dotacion)}</span>
            </>
          ),
        };
      })}
    />
  );
}
