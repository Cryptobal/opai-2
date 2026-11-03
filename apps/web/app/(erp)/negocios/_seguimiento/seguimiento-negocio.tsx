import { Badge, Empty, SeccionTarjeta } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";

import { BarraSeguimiento, BotonesPaso, IniciarSeguimiento } from "./acciones";
import type { PlanOpcion, VistaSeguimiento } from "./datos";
import { CANAL, EJECUTOR, ESTADO_PASO, ESTADO_VISIBLE, MOTIVO } from "./etiquetas";

type Props = { negocioId: string; seguimiento: VistaSeguimiento | null; planes: PlanOpcion[]; gestiona: boolean; abierto: boolean };

/** Pestaña Seguimiento del negocio: plan, estado, próximo paso y cada paso con su resultado. */
export function SeguimientoNegocio({ negocioId, seguimiento: s, planes, gestiona, abierto }: Props) {
  const iniciar = gestiona && abierto && planes.length > 0 ? <IniciarSeguimiento negocioId={negocioId} planes={planes} reemplaza={s?.estado === "activo" || s?.estado === "pausado"} /> : null;
  if (!s) {
    return (
      <Empty
        titulo="Este negocio no tiene seguimiento"
        descripcion={planes.length ? "Inicia un plan para que OPAI te recuerde cada paso en días hábiles." : "Aún no hay un plan de seguimiento. Créalo en Configuración › Comercial › Seguimiento."}
        {...(iniciar ? { accion: iniciar } : {})}
      />
    );
  }
  const est = ESTADO_VISIBLE[s.estadoVisible] ?? ESTADO_VISIBLE["activo"]!;
  const vivo = s.estado === "activo" || s.estado === "pausado";
  return (
    <div className="flex flex-col gap-4">
      <SeccionTarjeta
        titulo={s.planNombre}
        accion={gestiona && vivo ? <BarraSeguimiento id={s.id} estado={s.estado} /> : iniciar}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tono={est.tono}>{est.texto}</Badge>
            <span className="t-caption">
              Desde el {fecha(s.ancla)}
              {s.cotizacionCodigo ? ` · cotización ${s.cotizacionCodigo}` : ""}
            </span>
          </div>
          {s.motivo ? <p className="t-caption">{MOTIVO[s.motivo] ?? s.motivo}</p> : null}
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Pasos">
        <ol className="flex flex-col gap-3">
          {s.pasos.map((p) => {
            const e = ESTADO_PASO[p.estado] ?? ESTADO_PASO["programado"]!;
            return (
              <li key={p.id} className="flex flex-col gap-2 border-l-2 border-border pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.orden}. {p.titulo}</span>
                  <Badge tono={e.tono}>{e.texto}</Badge>
                  {p.id === s.proximoPasoId ? <Badge tono="accent">Próximo</Badge> : null}
                </div>
                <span className="t-caption">
                  {CANAL[p.canal]} · {EJECUTOR[p.ejecutor]} · {fecha(p.programadoEn)} {hora(p.programadoEn)}
                </span>
                {p.resultado ? <p className="text-base">{p.resultado}</p> : null}
                {p.error ? <p className="text-base text-danger-fg">{p.error}</p> : null}
                {gestiona && s.estado === "activo" ? <BotonesPaso paso={p} /> : null}
              </li>
            );
          })}
        </ol>
      </SeccionTarjeta>
    </div>
  );
}
