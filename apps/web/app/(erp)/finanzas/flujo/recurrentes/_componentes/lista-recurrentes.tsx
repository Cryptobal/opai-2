import { Plus, Repeat } from "lucide-react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";
import { formatearFecha } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { cuando, type FilaEgreso, montoLegible, type Recurrente } from "./tipos";

/** Con un cambio «desde una fecha» (CAR-413), desde cuándo rige el tramo vigente. */
const cuandoTramo = (r: Recurrente) => (r.anteriorId ? `${cuando(r)} desde el ${formatearFecha(r.inicio)}` : cuando(r));
const Estado = ({ r }: { r: Recurrente }) => <Badge tono={r.activa ? "success" : "neutro"}>{r.activa ? "Activo" : "Pausado"}</Badge>;

/** Lista de gastos recurrentes (CAR-382): fila, monto con su unidad, frecuencia y estado. */
export function ListaRecurrentes(p: { state: EstadoPantalla; items: Recurrente[]; filas: FilaEgreso[]; configura: boolean }) {
  const filaDe = new Map(p.filas.map((f) => [f.id, f.etiqueta]));
  const fila = (r: Recurrente) => filaDe.get(r.filaId) ?? "Fila archivada";
  return (
    <ListScreen<Recurrente>
      state={p.state}
      titulo="Gastos recurrentes"
      {...(p.configura && p.filas.length ? { accionPrincipal: <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>Nuevo gasto recurrente</EnlaceBotonHoja> } : {})}
      items={p.items}
      clave={(x) => x.id}
      {...(p.configura ? { href: (x: Recurrente) => `?editar=${x.id}` } : {})}
      Link={LinkNext}
      textos={{
        vacio: p.filas.length
          ? { titulo: "Aún no hay gastos recurrentes", descripcion: "Agrega el arriendo, los honorarios o el retiro de cada socio: el flujo los proyecta solos y los da por pagados cuando llega el cargo del banco." }
          : { titulo: "Primero crea una fila de egresos", descripcion: "Cada gasto recurrente va a una fila del flujo de caja.", accion: <EnlaceBoton href="/finanzas/flujo" variante="secondary">Ir al flujo</EnlaceBoton> },
      }}
      tarjeta={(x) => (
        <>
          <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-fill text-fg-muted">
            <Repeat className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{x.concepto}</span>
            <span className="truncate text-sm text-fg-muted">{montoLegible(x)} · {cuandoTramo(x)}</span>
          </span>
          <Estado r={x} />
        </>
      )}
      columnas={[
        { id: "c", etiqueta: "Concepto", render: (x) => <span className="font-medium">{x.concepto}</span> },
        { id: "f", etiqueta: "Fila del flujo", render: fila },
        { id: "m", etiqueta: "Monto por cuota", className: "t-numeric", render: montoLegible },
        { id: "q", etiqueta: "Cuándo", render: cuandoTramo },
        { id: "e", etiqueta: "Estado", render: (x) => <Estado r={x} /> },
      ]}
    />
  );
}
