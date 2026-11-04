import { Badge, Checkbox, Input } from "@opai/ds";

import { pesos } from "@/lib/fechas";

/** Una línea de guardias de la oferta (`cpq.puestos.ofrecer`). */
export type LineaOferta = {
  lineaId: string;
  linea: string;
  cargoId: string | null;
  cargo: string | null;
  instalacionId: string | null;
  instalacion: string | null;
  posiciones: number;
  creados: number;
  patron: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  sueldoBaseClp?: number | null;
  sueldoOrigen?: string | null;
};

/** Lo que RRHH ajusta por línea antes de confirmar. */
export type Ajuste = { incluir: boolean; cantidad: number; nombre: string };

/** Qué le falta a la línea para crear su puesto (el servidor lo vuelve a validar). */
export function faltaDeLinea(l: LineaOferta): string | null {
  if (!l.instalacionId) return "instalación";
  if (!l.cargoId) return "cargo";
  if (!l.patron) return "patrón de turno";
  if (!l.horaInicio || !l.horaFin) return "horario";
  return null;
}

export function FilaOfertaPuesto(p: {
  l: LineaOferta;
  a: Ajuste;
  costos: boolean;
  onCambio: (a: Ajuste) => void;
}) {
  const { l, a } = p;
  const pendientes = l.posiciones - l.creados;
  const falta = faltaDeLinea(l);
  const hecho = pendientes <= 0;
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          soloControl
          etiqueta={`Crear ${l.linea}`}
          marcado={a.incluir && !hecho}
          disabled={hecho}
          onCambiar={(v) => p.onCambio({ ...a, incluir: v })}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="t-body-sm font-medium">{l.cargo ?? l.linea}</span>
          <span className="t-caption">
            {l.instalacion ?? "Sin instalación"} · {l.patron ?? "sin patrón"}
            {l.horaInicio && l.horaFin ? ` · ${l.horaInicio}–${l.horaFin}` : ""}
          </span>
          {p.costos && l.sueldoBaseClp != null ? (
            <span className="t-caption">
              Sueldo cotizado {pesos(l.sueldoBaseClp)}
              {l.sueldoOrigen === "referencia_cargo" ? " · referencia del cargo" : " · manual"}
            </span>
          ) : null}
        </div>
        {hecho ? (
          <Badge tono="success">Creados</Badge>
        ) : (
          <Badge tono="neutro">
            {pendientes} {pendientes === 1 ? "puesto" : "puestos"}
          </Badge>
        )}
      </div>
      {falta && !hecho ? (
        <p className="t-caption text-warning-fg">
          Falta {falta}: el servidor te pedirá completarlo antes de crear.
        </p>
      ) : null}
      {a.incluir && !hecho ? (
        <div className="flex gap-2 pl-8">
          <Input
            aria-label={`Nombre base de ${l.linea}`}
            value={a.nombre}
            onChange={(e) => p.onCambio({ ...a, nombre: e.target.value })}
            className="min-w-0 flex-1"
          />
          <Input
            aria-label={`Cantidad de ${l.linea}`}
            type="number"
            min={1}
            max={pendientes}
            value={a.cantidad}
            onChange={(e) =>
              p.onCambio({ ...a, cantidad: Math.min(Math.max(Number(e.target.value) || 1, 1), pendientes) })
            }
            className="w-20"
          />
        </div>
      ) : null}
    </li>
  );
}
