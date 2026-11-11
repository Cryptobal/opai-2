import { BarraProgreso, BarrasVerticales, SeccionTarjeta } from "@opai/ds";

import { CANAL, type Canal } from "@/app/(erp)/solicitudes/_componentes/etiquetas";
import { pesos } from "@/lib/fechas";

import type { Tablero } from "./datos";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const nota = (texto: string) => <span className="t-caption">{texto}</span>;
const vacio = (texto: string) => <p className="t-body-sm text-fg-muted">{texto}</p>;

/** «$ 6,5 M» para etiquetas de barras; bajo un millón, el monto completo. */
export const pesosCortos = (n: number) =>
  n >= 1_000_000 ? `$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} M` : pesos(n);

const mesCorto = (mes: string) =>
  new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));

export function Embudo({ t }: { t: Tablero }) {
  const tope = Math.max(1, ...t.embudo.map((e) => e.montoMensualClp));
  return (
    <SeccionTarjeta titulo="Embudo y conversión" accion={nota("Negocios abiertos hoy")}>
      <ul className="flex flex-col gap-3">
        {t.embudo.map((e) => (
          <li key={e.etapaId} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2">
              <span className="t-body-sm truncate font-medium">{e.nombre}</span>
              <span className="t-body-sm t-numeric whitespace-nowrap">{e.cantidad} · {pesos(e.montoMensualClp)}</span>
            </div>
            <BarraProgreso valor={e.montoMensualClp / tope} tono="neutro" etiqueta={`${e.nombre}: ${pesos(e.montoMensualClp)}`} />
            <span className="t-caption t-numeric">
              {e.diasPromedio === null ? "Sin movimientos en 12 meses" : `${plural(e.diasPromedio, "día", "días")} promedio · ${e.avanzaPct ?? 0} % avanza`}
            </span>
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}

export function GanadosPerdidos({ t }: { t: Tablero }) {
  const tope = Math.max(1, ...t.perdidas.motivos.map((m) => m.cantidad));
  const cifra = (titulo: string, monto: number, tono: string) => (
    <div className="flex flex-col gap-0.5 rounded-md bg-fill p-3">
      <span className="t-caption">{titulo}</span>
      <span className={`t-numeric text-lg font-semibold ${tono}`}>{pesos(monto)}</span>
    </div>
  );
  return (
    <SeccionTarjeta titulo="Ganados y perdidos" accion={nota("Valor mensual del período")}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {cifra(`Ganados · ${t.cierre.ganados}`, t.cierre.montoGanadoMensualClp, "text-success-fg")}
          {cifra(`Perdidos · ${t.cierre.perdidos}`, t.cierre.montoPerdidoMensualClp, "text-danger-fg")}
        </div>
        <span className="t-label">Motivos de pérdida · últimos 12 meses</span>
        {t.perdidas.motivos.length === 0 ? vacio("Sin negocios perdidos en los últimos 12 meses.") : (
          <ul className="flex flex-col gap-2">
            {t.perdidas.motivos.map((m) => (
              <li key={m.motivoId ?? "sin"} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_1.75rem] items-center gap-2">
                <span className="t-body-sm truncate">{m.nombre}</span>
                <BarraProgreso valor={m.cantidad / tope} tono="danger" etiqueta={`${m.nombre}: ${m.cantidad}`} />
                <span className="t-body-sm t-numeric text-right">{m.cantidad}</span>
              </li>
            ))}
          </ul>
        )}
        {t.perdidas.competidores.length ? (
          <span className="t-caption text-pretty">Competidores más nombrados: {t.perdidas.competidores.map((c) => `${c.nombre} ${c.cantidad}`).join(" · ")}.</span>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}

export function Canales({ canales }: { canales: NonNullable<Tablero["canales"]> }) {
  const tope = Math.max(1, ...canales.map((c) => c.solicitudes));
  return (
    <SeccionTarjeta titulo="Solicitudes por canal" accion={nota("Y su conversión a negocio")}>
      <ul className="flex flex-col gap-3">
        {canales.map((c) => {
          const nombre = CANAL[c.canal as Canal]?.etiqueta ?? c.canal;
          return (
            <li key={c.canal} className="flex flex-col gap-1">
              <div className="flex flex-wrap justify-between gap-x-2">
                <span className="t-body-sm font-medium">{nombre}</span>
                <span className="t-body-sm t-numeric">
                  {plural(c.solicitudes, "solicitud", "solicitudes")} · {plural(c.negocios, "negocio", "negocios")} · {c.conversionPct} %
                </span>
              </div>
              <BarraProgreso valor={c.negocios / tope} resto={(c.solicitudes - c.negocios) / tope} etiqueta={`${nombre}: ${c.negocios} de ${c.solicitudes} llegaron a negocio`} />
            </li>
          );
        })}
      </ul>
      <p className="t-caption mt-3">Color: llegaron a negocio · gris: descartadas o en revisión. Solicitudes recibidas en el período.</p>
    </SeccionTarjeta>
  );
}

export function Pronostico({ t }: { t: Tablero }) {
  const p = t.pronostico;
  const tope = Math.max(1, ...p.meses.map((m) => m.ponderadoClp));
  return (
    <SeccionTarjeta titulo="Pronóstico ponderado" accion={nota("Por mes de cierre estimado")}>
      <BarrasVerticales
        etiqueta="Pronóstico ponderado por mes de cierre estimado"
        barras={p.meses.map((m) => ({ etiqueta: mesCorto(m.mes), valor: pesosCortos(m.ponderadoClp), fraccion: m.ponderadoClp / tope }))}
      />
      <p className="t-caption t-numeric mt-3">
        Total ponderado {pesos(p.totalPonderadoClp)} · valor por probabilidad de la etapa
        {p.fueraDeRango.cantidad ? ` · ${plural(p.fueraDeRango.cantidad, "negocio", "negocios")} sin fecha en estos meses (${pesos(p.fueraDeRango.ponderadoClp)})` : ""}
      </p>
    </SeccionTarjeta>
  );
}
