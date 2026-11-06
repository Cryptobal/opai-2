import { Badge, SeccionTarjeta } from "@opai/ds";

import { fechaCorta } from "@/lib/formato";

import { BotonRespaldo } from "../boton-respaldo";
import { diaIso, kmTexto, pesos } from "../formato";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO, TONO_ESTADO } from "../tipos";
import { AccionesDecision } from "./acciones-decision";
import type { DetalleBandeja } from "./tipos";

/** Detalle para revisar: quién rinde, gastos con su respaldo y las acciones de decisión (solo si le toca decidir). */
export function DetalleRevision({ d, yoId }: { d: DetalleBandeja; yoId: string }) {
  const r = d.rendicion;
  const propia = r.solicitanteId === yoId;
  const puedeDecidir = r.estado === "enviada" && r.aprobadorId === yoId && !propia;
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-title text-fg">{r.codigoVisible}</h2>
        <Badge tono={TONO_ESTADO[r.estado]}>{ETIQUETA_ESTADO[r.estado]}</Badge>
      </div>
      <p className="text-md text-fg">{r.descripcion}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
        <dt className="text-fg-muted">Solicita</dt>
        <dd className="text-right font-medium">{d.solicitanteNombre ?? "Persona de la empresa"}</dd>
        <dt className="text-fg-muted">Tipo</dt>
        <dd className="text-right">{ETIQUETA_TIPO[r.tipo] ?? r.tipo}</dd>
        <dt className="text-fg-muted">Centro de costo</dt>
        <dd className="text-right">{r.centroCosto === "administracion" ? "Administración / Oficina central" : "Instalación"}</dd>
        <dt className="text-fg-muted">Enviada</dt>
        <dd className="text-right">{r.enviadaEn ? fechaCorta(r.enviadaEn) : "—"}</dd>
        <dt className="text-fg-muted">Total</dt>
        <dd className="text-right font-semibold tabular-nums">{pesos(r.montoTotal)}</dd>
      </dl>
      {r.viaje ? (
        <SeccionTarjeta titulo="Viaje">
          <p className="text-base">{r.viaje.origen} → {r.viaje.destino}</p>
          <p className="t-caption mt-1">
            {kmTexto(r.viaje.km)} km{r.viaje.idaYVuelta ? " (ida y vuelta)" : ""} · peaje {pesos(r.viaje.peajeClp)} ·{" "}
            {r.viaje.origenDistancia === "google" ? "por ruta" : "en línea recta"}
          </p>
        </SeccionTarjeta>
      ) : (
        <SeccionTarjeta titulo={`Gastos (${r.items.length})`} sinRelleno>
          <ul>
            {r.items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="t-label text-fg">{i.tipoDocumento === "factura" ? "Factura" : "Boleta"} {i.folio ?? ""} · {i.proveedor}</p>
                  <p className="text-base text-fg-muted">{i.descripcion} · {diaIso(i.fecha)}</p>
                  {!i.documentoId && i.sinRespaldoMotivo ? <p className="text-sm text-warning-fg">Sin respaldo: «{i.sinRespaldoMotivo}»</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular-nums">{pesos(i.monto)}</span>
                  {i.documentoId ? <BotonRespaldo portal="erp" rendicionId={r.id} documentoId={i.documentoId} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </SeccionTarjeta>
      )}
      {r.motivoDecision && r.estado !== "enviada" ? (
        <p role="note" className="rounded-md bg-warning-muted px-3 py-2 text-base text-warning-fg">«{r.motivoDecision}»</p>
      ) : null}
      {propia ? <p role="note" className="rounded-md bg-fill px-3 py-2 text-base text-fg-muted">Es tu propia rendición: no puedes aprobarla. Otro aprobador la revisará.</p> : null}
      {puedeDecidir ? <AccionesDecision id={r.id} codigo={r.codigoVisible} /> : null}
    </div>
  );
}
