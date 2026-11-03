import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { pesos } from "@/lib/fechas";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

type Montos = {
  cargoId: string;
  items: {
    instalacionId: string;
    instalacionNombre: string;
    puestos: number;
    sueldoBase: number | null;
    sensible: boolean;
  }[];
};

export async function SeccionMontosPorInstalacion({ cargoId }: { cargoId: string }) {
  const identidad = await requerirIdentidad("/cargos");
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasRead)) return null;
  const r = await ejecutarComoUsuario<Montos>("erp", "core.cargos.montos_por_instalacion", {
    id: cargoId,
  });
  if (!r.ok) return null;
  return (
    <SeccionTarjeta titulo="Montos por instalación">
      {r.data.items.length === 0 ? (
        <p className="t-caption">Sin puestos activos con este cargo.</p>
      ) : (
        <ParesGrid
          unaColumna
          items={r.data.items.map((i) => ({
            etiqueta: i.instalacionNombre,
            valor: i.sensible
              ? "Monto sensible (sin permiso)"
              : i.sueldoBase != null
                ? `${pesos(i.sueldoBase)} · ${i.puestos} puesto(s)`
                : `Sin estructura · ${i.puestos} puesto(s)`,
          }))}
        />
      )}
    </SeccionTarjeta>
  );
}
