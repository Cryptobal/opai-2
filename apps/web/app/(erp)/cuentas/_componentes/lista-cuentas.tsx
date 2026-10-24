import { Plus } from "lucide-react";

import { Badge, type EstadoPantalla, MonoAv } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { ESTADO_CUENTA, estadoDe, monograma } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { rut } from "@/lib/fechas";
import type { CuentaFila } from "@/lib/tipos-maestros";

const plural = (n: number) =>
  n === 0 ? "sin instalaciones" : `${n} ${n === 1 ? "instalación" : "instalaciones"}`;

/** Columna de cuentas (lista 01/02): monograma, nombre, "RUT · instalaciones" y estado. */
export function ListaCuentas(p: {
  state: EstadoPantalla;
  items: CuentaFila[];
  seleccionada?: string;
}) {
  const activas = p.items.filter((c) => c.estado === "cliente_activo").length;
  const nueva = (
    <EnlaceBoton href="/cuentas?nueva=1" icono={Plus} className="md:hidden">
      Nueva
    </EnlaceBoton>
  );
  return (
    <ListaMaestro
      state={p.state}
      titulo="Cuentas"
      accion={nueva}
      buscar="Buscar por nombre o RUT"
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: Object.entries(ESTADO_CUENTA).map(([valor, e]) => ({
            valor,
            etiqueta: e.etiqueta,
          })),
        },
        {
          param: "con",
          etiqueta: "Con instalaciones",
          opciones: [{ valor: "si", etiqueta: "Sí" }],
        },
      ]}
      meta={{
        izquierda: `${p.items.length} cuentas · ${activas} ${activas === 1 ? "cliente activo" : "clientes activos"}`,
        derecha: "Nombre A–Z",
      }}
      seleccionada={p.seleccionada}
      vacio={{
        titulo: "Aún no hay cuentas",
        descripcion: "Crea la primera para registrar sus instalaciones, contactos y documentos.",
        accion: nueva,
      }}
      filas={p.items.map((c) => {
        const e = estadoDe(ESTADO_CUENTA, c.estado);
        return {
          id: c.id,
          href: `/cuentas/${c.id}`,
          inicio: <MonoAv texto={monograma(c.nombre)} seleccionada={p.seleccionada === c.id} />,
          titulo: c.nombre,
          secundario: (
            <>
              <span className="t-mono text-[13px]">{rut(c.rut)}</span>
              <span className="md:hidden"> · {e.etiqueta}</span>
              <span className="hidden md:inline"> · {plural(c.instalaciones)}</span>
            </>
          ),
          terciario: <span className="md:hidden">{plural(c.instalaciones)}</span>,
          fin: (
            <Badge tono={e.tono} className="hidden md:inline-flex">
              {e.corta}
            </Badge>
          ),
        };
      })}
    />
  );
}
