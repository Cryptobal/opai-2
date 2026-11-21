import { Alerta } from "@opai/ds";
import { TURNO_PROXIMO_MS, TURNO_RECIENTE_MS } from "@opai/domain";

import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

/** Avisa en el ERP cuando la pauta no alimenta el «Turno de ahora» del equipo (CAR-801). */
export async function AvisoTurnosTerreno({ i }: { i: InstalacionDetalle }) {
  const identidad = await requerirIdentidad(`/instalaciones/${i.id}`);
  if (!identidad.modulosActivos.includes("pauta")) return null;

  const activos = i.puestos.filter((p) => p.estado === "activo");
  const sinTitular = activos.filter((p) => p.cobertura === "ppc");
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - TURNO_RECIENTE_MS);
  const hasta = new Date(ahora.getTime() + TURNO_PROXIMO_MS);
  const d0 = desde.toISOString().slice(0, 10);
  const d1 = hasta.toISOString().slice(0, 10);
  const turnos = await ejecutarComoUsuario<{ items: { inicio: string; fin: string }[] }>(
    "erp",
    "core.turnos_esperados.listar",
    { instalacionId: i.id, desde: d0, hasta: d1, limite: 200 },
  );
  const enVentana =
    turnos.ok ?
      turnos.data.items.filter((t) => new Date(t.fin) > desde && new Date(t.inicio) < hasta).length
    : 0;

  if (sinTitular.length === 0 && enVentana > 0) return null;

  const partes: string[] = [];
  if (sinTitular.length > 0)
    partes.push(
      `${sinTitular.length} puesto${sinTitular.length === 1 ? "" : "s"} activo${sinTitular.length === 1 ? "" : "s"} sin titular (PPC).`,
    );
  if (enVentana === 0 && activos.length > 0)
    partes.push("No hay turnos esperados para esta instalación en las próximas horas.");
  if (partes.length === 0) return null;

  return (
    <Alerta tono="warning" titulo="El equipo de Terreno puede quedar sin turno de ahora">
      {partes.join(" ")} Revisa la pauta, las series y los titulares de cada puesto.
    </Alerta>
  );
}