import { PERMISOS_CORE } from "@opai/domain";
import { Badge, Empty, SeccionTarjeta } from "@opai/ds";

import { fechaHora } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { AccionesDispositivos, BotonRevocar } from "./acciones-dispositivos";

type Item = {
  id: string;
  identificador: string;
  estado: "activo" | "revocado";
  emparejadoEn: string;
  ultimoContacto: string | null;
  versionApp: string | null;
  revocadoEn: string | null;
};

/** Pestaña «Dispositivos» de la instalación (ADR-041): equipos de terreno emparejados, QR y revocación. */
export async function PestanaDispositivos({ instalacionId }: { instalacionId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  const puedeGestionar = puedeDeIdentidad(identidad)(PERMISOS_CORE.instalacionesManage);
  const r = await ejecutarComoUsuario<{ items: Item[] }>("erp", "core.dispositivos.listar", {
    instalacionId,
  });
  const items = r.ok ? r.data.items : [];
  return (
    <SeccionTarjeta
      titulo="Dispositivos de terreno"
      accion={puedeGestionar ? <AccionesDispositivos instalacionId={instalacionId} /> : undefined}
    >
      {!r.ok ? (
        <p className="text-base text-fg-muted">
          No se pudieron cargar los dispositivos. Vuelve a intentarlo.
        </p>
      ) : items.length === 0 ? (
        <Empty
          titulo="Sin dispositivos emparejados"
          descripcion="Empareja el equipo de la portería para que cada guardia marque desde ahí."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-base font-medium text-fg">
                  <span className="t-mono">{d.identificador}</span>
                  <Badge tono={d.estado === "activo" ? "success" : "neutro"}>
                    {d.estado === "activo" ? "Activo" : "Revocado"}
                  </Badge>
                </span>
                <span className="t-caption">
                  Emparejado {fechaHora(d.emparejadoEn)}
                  {d.ultimoContacto ? ` · último contacto ${fechaHora(d.ultimoContacto)}` : ""}
                  {d.versionApp ? ` · ${d.versionApp}` : ""}
                </span>
              </div>
              {puedeGestionar && d.estado === "activo" ? (
                <BotonRevocar dispositivoId={d.id} identificador={d.identificador} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SeccionTarjeta>
  );
}
