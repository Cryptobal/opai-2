import { PaginaPortal } from "@/app/_components/pagina-portal";
import { LinkNext } from "@/app/_components/link-next";
import { Badge, ListScreen, type EstadoPantalla } from "@opai/ds";

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
  moneda: string;
  montoTotal: number;
  proximaEjecucionEn: string | null;
};

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

/** Plantillas de facturación recurrente (CAR-25). */
export default function ProgramacionVentasPage() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Ventas (DTE)"
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
      <ListScreen<Programacion>
        state={state}
        titulo="Programación recurrente"
        subtitulo="Plantillas que generan borradores (el cron no emite al SII)."
        items={items}
        clave={(p) => p.id}
        href={(p) => `/finanzas/ventas/programacion/${p.id}`}
        Link={LinkNext}
        columnas={[
          { id: "nombre", etiqueta: "Plantilla", render: (p) => p.nombre },
          { id: "cliente", etiqueta: "Cliente", render: (p) => p.cuentaNombre },
          {
            id: "monto",
            etiqueta: "Monto ref.",
            render: (p) => (p.moneda === "CLP" ? pesos(p.montoTotal) : `${p.montoTotal} ${p.moneda}`),
          },
          { id: "dia", etiqueta: "Día borrador", render: (p) => String(p.diaGeneracion) },
        ]}
        textos={{
          vacio: {
            titulo: "Sin plantillas",
            descripcion: "Importa desde OPAI 1.0 o crea plantillas cuando esté disponible la edición.",
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
              {p.moneda === "CLP" ? pesos(p.montoTotal) : `${p.montoTotal} ${p.moneda}`} · día{" "}
              {p.diaGeneracion}
            </p>
          </>
        )}
      />
    </div>
  );
}
