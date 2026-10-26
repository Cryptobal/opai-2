import { Plus } from "lucide-react";

import { Badge, type EstadoPantalla, MonoAv } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { monograma } from "@/app/_components/maestros/estados";
import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { pesos } from "@/lib/fechas";
import { conBusqueda } from "@/lib/parametros";

import type { NegocioFila } from "./datos";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

const monto = (n: NegocioFila) => n.valorMensual ?? n.montoEstimadoMensual ?? null;

/** Columna de negocios: monograma de la cuenta, título, "cuenta · etapa" y estado con el monto. */
export function ListaNegocios(p: {
  state: EstadoPantalla;
  items: NegocioFila[];
  seleccionado?: string;
  q?: string | undefined;
}) {
  const abiertos = p.items.filter((n) => n.estado === "abierto").length;
  const nuevo = (
    <EnlaceBotonHoja href="/negocios?nuevo=1" icono={Plus}>
      Nuevo
    </EnlaceBotonHoja>
  );
  return (
    <ListaMaestro
      state={p.state}
      titulo="Negocios"
      accion={nuevo}
      buscar="Buscar por título"
      filtros={[
        {
          param: "estado",
          etiqueta: "Estado",
          opciones: Object.entries(ESTADO).map(([valor, etiqueta]) => ({ valor, etiqueta })),
        },
      ]}
      meta={{
        izquierda: `${p.items.length} negocios · ${abiertos} ${abiertos === 1 ? "abierto" : "abiertos"}`,
        derecha: "Recientes primero",
      }}
      seleccionada={p.seleccionado}
      vacio={{
        titulo: "Aún no hay negocios",
        descripcion: "Crea el primero para seguir la oportunidad por el embudo.",
        accion: nuevo,
      }}
      filas={p.items.map((n) => ({
        id: n.id,
        href: conBusqueda(`/negocios/${n.id}`, p.q),
        inicio: <MonoAv texto={monograma(n.cuentaNombre || n.titulo)} seleccionada={p.seleccionado === n.id} />,
        titulo: n.titulo,
        secundario: (
          <>
            {n.cuentaNombre}
            <span> · {n.etapaNombre}</span>
          </>
        ),
        terciario: monto(n) != null ? <span className="md:hidden">{pesos(monto(n))}/mes</span> : undefined,
        fin: (
          <span className="flex flex-col items-end gap-1">
            <Badge tono={TONO[n.estado]}>{ESTADO[n.estado]}</Badge>
            {monto(n) != null ? (
              <span className="t-caption hidden md:inline">{pesos(monto(n))}/mes</span>
            ) : null}
          </span>
        ),
      }))}
    />
  );
}
