import { Alerta } from "../acceso/alerta";

export type ImpactoSueldo = {
  puestos: number;
  personasRut: number;
  borradores: number;
  pendientesVinculo: number;
  diferencias: readonly {
    concepto: string;
    antes: number | string | null;
    despues: number | string | null;
    diferencia: number | null;
  }[];
};
export function ImpactoCambio({ impacto: i }: { impacto: ImpactoSueldo }) {
  return (
    <Alerta
      tono="info"
      titulo={`${i.puestos} puestos · ${i.personasRut} personas con capa RUT · ${i.borradores} borradores previstos`}
    >
      <p>El consumidor de borradores llega en el PR 4; este cambio registra el evento.</p>
      <p>
        {i.pendientesVinculo} vínculos vigentes del tenant pendientes de vínculo con instalación (PR
        3); no atribuidos a esta instalación ni valorizados.
      </p>
    </Alerta>
  );
}
export function AntesDespues({ diferencias }: { diferencias: ImpactoSueldo["diferencias"] }) {
  const etiquetas: Record<string, string> = {
    sueldoBase: "Sueldo base",
    colacion: "Colación",
    movilizacion: "Movilización",
    gratificacionMonto: "Gratificación fija",
    legal_25: "Legal 25 % con tope",
    monto_fijo: "Monto fijo",
    ninguna: "Ninguna",
  };
  const texto = (n: number | string | null) =>
    n === null ? "Sin dato" : typeof n === "string" ? n : new Intl.NumberFormat("es-CL").format(n);
  return (
    <dl className="divide-y divide-border">
      {diferencias.map((d) => (
        <div className="flex flex-wrap justify-between gap-2 py-2" key={d.concepto}>
          <dt className="t-label">{etiquetas[d.concepto] ?? d.concepto}</dt>
          <dd className="t-numeric">
            {texto(d.antes)} → {texto(d.despues)} · diferencia {texto(d.diferencia)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
