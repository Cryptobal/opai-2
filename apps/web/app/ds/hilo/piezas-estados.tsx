import { Button, DashboardScreen, Empty, ErrorState, Forbidden, Loading } from "@opai/ds";

const Titulo = ({ children }: { children: string }) => <h2 className="t-overline text-fg-muted">{children}</h2>;

const KPIS = [
  { etiqueta: "Turnos cubiertos", valor: "146 de 148", variacion: { texto: "2 sin cubrir", tono: "warning" as const } },
  { etiqueta: "Por cobrar", valor: "$31.750.000", variacion: { texto: "$6.200.000 vencido", tono: "danger" as const } },
  { etiqueta: "Negocios por cerrar", valor: "5", variacion: { texto: "Este mes", tono: "neutro" as const } },
  { etiqueta: "Asistencia", valor: "98,6 %", variacion: { texto: "+0,4 vs. octubre", tono: "success" as const } },
];

/**
 * Indicadores y estados de una pantalla con la piel del marco Hilo (H2, CAR-324). Datos ficticios; se
 * compara con «Piezas y estados del diseño» (Estados) y con el «Pulso» de Inicio en
 * docs/2.0/design/export-base-hilo/.
 */
export function EstadosHilo() {
  return (
    <div className="flex max-w-[900px] flex-col gap-8" data-testid="piezas-estados">
      <section className="flex flex-col gap-3">
        <Titulo>Indicadores</Titulo>
        <DashboardScreen state="ready" titulo="Pulso" kpis={KPIS} />
      </section>
      <section className="flex flex-col gap-3">
        <Titulo>Estados de pantalla</Titulo>
        <Empty
          titulo="Todavía no hay cuentas"
          descripcion="Crea la primera o impórtalas desde una planilla."
          accion={<Button variant="secondary">Nueva cuenta</Button>}
        />
        <Loading variante="lista" />
        <ErrorState
          titulo="No pudimos cargar las cuentas"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={<Button variant="secondary">Reintentar</Button>}
        />
        <Forbidden />
      </section>
    </div>
  );
}
