import { Alerta } from "@opai/ds";

export type PlanAusencia = {
  dias: number;
  puestos: { puestoId: string; puesto: string; instalacion: string; dias: number }[];
};

/** Lo que va a pasar al registrar: solo el registro, o los turnos que quedan por cubrir en la pauta. */
export function AvisoPlan({ plan, conPauta }: { plan: PlanAusencia | null; conPauta: boolean }) {
  if (!plan) return null;
  if (plan.dias === 0)
    return (
      <Alerta tono="info" titulo="Queda solo el registro">
        {conPauta ? "No tiene turnos en la pauta en esas fechas." : "Lista para registrar."}
      </Alerta>
    );
  return (
    <Alerta
      tono="info"
      titulo={
        plan.dias === 1 ? "1 turno queda por cubrir" : `${plan.dias} turnos quedan por cubrir`
      }
    >
      {plan.puestos.map((p) => `${p.instalacion} · ${p.puesto}: ${p.dias}`).join(" · ")}
    </Alerta>
  );
}
