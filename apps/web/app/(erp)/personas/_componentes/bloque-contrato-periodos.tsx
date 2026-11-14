import { History, Plus, Undo2 } from "lucide-react";
import { Alerta, Badge } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { fecha, hoyIso } from "@/lib/fechas";

import { HojasPeriodoContrato } from "./diferidas-laboral";
import { estadoVencimiento } from "./estado-ficha";
import type { ContratoPeriodos, PeriodoContrato } from "./lecturas-ficha";

const MAX_PLAZOS = 3;

export function textoPeriodo(p: PeriodoContrato): string {
  return p.tipo === "indefinido"
    ? `Indefinido desde ${fecha(p.inicio)}`
    : `${p.numero}.º plazo fijo · ${fecha(p.inicio)} al ${p.termino ? fecha(p.termino) : "—"}`;
}

/** Día siguiente a una fecha ISO (inicio sugerido de la renovación). */
function diaSiguiente(d: string): string {
  const f = new Date(`${d}T00:00:00.000Z`);
  f.setUTCDate(f.getUTCDate() + 1);
  return f.toISOString().slice(0, 10);
}

/**
 * Historia del contrato vigente (CAR-409, referente Rippling: cada cambio es un registro con vigencia):
 * los períodos de plazo fijo y el paso a indefinido, con el aviso de vencimiento del vigente.
 */
export function BloqueContratoPeriodos({
  personaId,
  contrato,
  puede,
}: {
  personaId: string;
  contrato: ContratoPeriodos | null;
  puede: boolean;
}) {
  if (!contrato) {
    return (
      <p className="t-body-sm text-fg-muted">
        Sin contrato vigente: los períodos se registran sobre el contrato.
      </p>
    );
  }
  const { periodos, terminoVigente, periodoVigente, tipoContrato } = contrato;
  // Solo un contrato a plazo fijo admite registrar períodos; un indefinido sin historia es anterior a CAR-409.
  const indefinido = tipoContrato === "indefinido";
  const admite = tipoContrato === "plazo_fijo";
  const ultimo = periodos.at(-1);
  const plazo = estadoVencimiento(hoyIso(), terminoVigente);
  const plazos = periodos.filter((p) => p.tipo === "plazo_fijo").length;
  const inicioSugerido = ultimo?.termino ? diaSiguiente(ultimo.termino) : contrato.inicioContrato;
  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="contrato-periodos">
      {plazo && plazo.tono !== "success" && terminoVigente ? (
        <Alerta
          tono={plazo.tono === "danger" ? "danger" : "warning"}
          titulo={`Plazo fijo: ${plazo.etiqueta.toLowerCase()}`}
        >
          Término el {fecha(terminoVigente)}
          {periodoVigente ? `, período ${periodoVigente} de ${MAX_PLAZOS}` : ""}. Decide si se
          renueva, pasa a indefinido o termina.
        </Alerta>
      ) : null}
      <div className="flex items-center gap-2">
        <History className="size-4 text-fg-muted" aria-hidden />
        <span className="t-label">Períodos del contrato</span>
        {indefinido ? <Badge tono="success">Indefinido</Badge> : null}
        {periodoVigente ? (
          <Badge tono="info">{`Plazo fijo ${periodoVigente} de ${MAX_PLAZOS}`}</Badge>
        ) : null}
      </div>
      {periodos.length ? (
        <ol className="flex flex-col gap-1.5">
          {periodos.map((p) => (
            <li key={p.id} className="t-body">
              {textoPeriodo(p)}
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-body-sm text-fg-muted">
          {admite ? "Sin períodos registrados." : "Este contrato no lleva períodos de plazo fijo."}
        </p>
      )}
      {puede ? (
        <div className="flex flex-wrap gap-2">
          {admite ? (
            <EnlaceBotonHoja variante="secondary" icono={Plus} href="?registrar-periodo=1">
              Registrar período
            </EnlaceBotonHoja>
          ) : null}
          {ultimo ? (
            <EnlaceBotonHoja variante="ghost" icono={Undo2} href="?anular-periodo=1">
              Anular último
            </EnlaceBotonHoja>
          ) : null}
          <HojasPeriodoContrato
            personaId={personaId}
            inicioSugerido={inicioSugerido}
            soloIndefinido={plazos >= MAX_PLAZOS}
            ultimo={ultimo ? { id: ultimo.id, descripcion: textoPeriodo(ultimo) } : null}
          />
        </div>
      ) : null}
    </div>
  );
}
