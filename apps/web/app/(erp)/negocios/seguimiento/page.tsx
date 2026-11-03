import { Badge, Empty, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha, hora } from "@/lib/fechas";

import { cargarPendientes } from "../_seguimiento/datos";
import { CANAL, ESTADO_PASO, ESTADO_VISIBLE } from "../_seguimiento/etiquetas";

export const metadata = { title: "Pendientes de seguimiento" };

/** Pendientes: los pasos de seguimiento que esperan a una persona o a un agente, con atrasos primero (CAR-67). */
export default function PendientesSeguimiento() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Pendientes de seguimiento"
      ruta="/negocios/seguimiento"
      cargar={cargarPendientes}
      opciones={() => ({ volver: { href: "/negocios", etiqueta: "Negocios" } })}
    >
      {(d) =>
        d.items.length === 0 ? (
          <Empty titulo="Sin pendientes" descripcion="Cuando venza un paso de un seguimiento, aparecerá aquí." />
        ) : (
          <SeccionTarjeta titulo={`${d.items.length} ${d.items.length === 1 ? "negocio" : "negocios"} con pasos por hacer`} sinRelleno>
            <ul className="divide-y divide-border">
              {d.items.map((s) => {
                const paso = s.pasos.find((p) => p.id === s.proximoPasoId) ?? s.pasos.find((p) => ["por_hacer", "por_preparar", "fallido"].includes(p.estado));
                const est = ESTADO_VISIBLE[s.estadoVisible] ?? ESTADO_VISIBLE["activo"]!;
                const ep = paso ? (ESTADO_PASO[paso.estado] ?? ESTADO_PASO["programado"]!) : null;
                return (
                  <li key={s.id}>
                    <LinkNext href={`/negocios/${s.negocioId}/seguimiento`} className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-fill">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.negocioTitulo}</span>
                        <Badge tono={est.tono}>{est.texto}</Badge>
                      </span>
                      {paso && ep ? (
                        <span className="t-caption">
                          {paso.titulo} · {CANAL[paso.canal]} · {fecha(paso.programadoEn)} {hora(paso.programadoEn)} · {ep.texto}
                        </span>
                      ) : null}
                    </LinkNext>
                  </li>
                );
              })}
            </ul>
          </SeccionTarjeta>
        )
      }
    </PaginaPortal>
  );
}
