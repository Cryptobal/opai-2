import { PERMISOS_CORE } from "@opai/domain";
import { Empty, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { AccionesEnlaceMarcacion } from "./acciones-enlace-marcacion";
import { AccionesDispositivos } from "./acciones-dispositivos";
import { FilasDispositivos } from "./filas-dispositivos";

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
  const puede = puedeDeIdentidad(identidad);
  const puedeGestionar = puede(PERMISOS_CORE.instalacionesManage);
  const puedeEnlaceMarcar = puedeGestionar || puede("asistencia:configurar");
  const r = await ejecutarComoUsuario<{ items: Item[] }>("erp", "core.dispositivos.listar", {
    instalacionId,
  });
  const items = r.ok ? r.data.items : [];
  return (
    <SeccionTarjeta
      titulo="Dispositivos de terreno"
      accion={
        puedeGestionar || puedeEnlaceMarcar ? (
          <div className="flex flex-wrap gap-2">
            {puedeGestionar ? <AccionesDispositivos instalacionId={instalacionId} /> : null}
            {puedeEnlaceMarcar ? <AccionesEnlaceMarcacion instalacionId={instalacionId} /> : null}
          </div>
        ) : undefined
      }
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
        <FilasDispositivos items={items} puedeGestionar={puedeGestionar} />
      )}
    </SeccionTarjeta>
  );
}