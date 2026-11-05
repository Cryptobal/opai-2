import { PaginaPortal } from "@/app/_components/pagina-portal";
import { LinkNext } from "@/app/_components/link-next";
import { Badge, estilosBoton, ListScreen, Tabs, type EstadoPantalla } from "@opai/ds";

import { pesos } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

type Programacion = {
  id: string;
  nombre: string;
  activa: boolean;
  cuentaNombre: string;
  instalacionNombre: string | null;
  tipoDte: 33 | 34;
  diaGeneracion: number;
  frecuencia: string;
  moneda: string;
  montoTotal: number;
  proximaEjecucionEn: string | null;
};

const FRECUENCIA: Record<string, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  semanal: "Semanal",
  anual: "Anual",
};
const agenda = (p: Programacion) =>
  `${FRECUENCIA[p.frecuencia] ?? p.frecuencia}, ${p.diaGeneracion === -1 ? "último día" : `día ${p.diaGeneracion}`}`;
const monto = (p: Programacion) =>
  `${pesos(p.montoTotal)}${p.moneda === "UF" ? " (UF, estimado)" : ""}`;

async function cargar() {
  await requerirIdentidad("/finanzas/ventas/programacion");
  const r = await ejecutarComoUsuario<{ items: Programacion[]; siguiente: string | null }>(
    "erp",
    "finanzas.ventas_programacion.listar",
    { limite: 100 },
  );
  return { state: estadoPantalla(r), items: r.ok ? r.data.items : [] };
}

export const metadata = { title: "Programación recurrente" };

/** Programaciones de facturación recurrente (CAR-25, BRIEF-26). */
export default function ProgramacionVentasPage() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Programación recurrente"
      ruta="/finanzas/ventas/programacion"
      cargar={cargar}
    >
      {(d) => <Contenido state={d.state} items={d.items} />}
    </PaginaPortal>
  );
}

function Contenido({ state, items }: { state: EstadoPantalla; items: Programacion[] }) {
  return (
    <div className="flex flex-col gap-3">
      <LinkNext href="/finanzas/ventas" className="text-sm text-fg-muted">
        ← Libro de ventas
      </LinkNext>
      <Tabs
        Link={LinkNext}
        activa="plantillas"
        tabs={[
          { id: "plantillas", etiqueta: "Plantillas", href: "/finanzas/ventas/programacion" },
          { id: "tablero", etiqueta: "Tablero del mes", href: "/finanzas/ventas/programacion/cierre" },
        ]}
      />
      <ListScreen<Programacion>
        state={state}
        titulo="Programación recurrente"
        subtitulo="Cada período se genera un borrador para revisar; nada se envía al SII sin tu revisión."
        accionPrincipal={
          <LinkNext
            href="/finanzas/ventas/programacion/nueva"
            className={estilosBoton({ variant: "primary" })}
          >
            Nueva programación
          </LinkNext>
        }
        items={items}
        clave={(p) => p.id}
        href={(p) => `/finanzas/ventas/programacion/${p.id}`}
        Link={LinkNext}
        columnas={[
          { id: "nombre", etiqueta: "Plantilla", render: (p) => p.nombre },
          { id: "cliente", etiqueta: "Cliente", render: (p) => p.cuentaNombre },
          { id: "monto", etiqueta: "Neto por período", render: monto },
          { id: "agenda", etiqueta: "Agenda", render: agenda },
          {
            id: "estado",
            etiqueta: "Estado",
            render: (p) => (
              <Badge tono={p.activa ? "success" : "neutro"}>
                {p.activa ? "Activa" : "Pausada"}
              </Badge>
            ),
          },
        ]}
        textos={{
          vacio: {
            titulo: "Sin programaciones",
            descripcion:
              "Crea una programación para facturar todos los meses al mismo cliente sin volver a digitar.",
          },
        }}
        tarjeta={(p) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{p.nombre}</span>
              {!p.activa ? <Badge tono="neutro">Pausada</Badge> : null}
            </div>
            <p className="text-sm text-fg-muted">
              {p.cuentaNombre}
              {p.instalacionNombre ? ` · ${p.instalacionNombre}` : ""}
            </p>
            <p className="text-sm">
              <span className="t-numeric">{monto(p)}</span> · {agenda(p)}
            </p>
          </>
        )}
      />
    </div>
  );
}
