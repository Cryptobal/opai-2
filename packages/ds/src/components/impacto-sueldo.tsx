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
const conteo = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n === 1 ? singular : plural}`;

export function ImpactoCambio({ impacto: i }: { impacto: ImpactoSueldo }) {
  return (
    <Alerta
      tono="info"
      titulo={`${conteo(i.puestos, "puesto")} · ${conteo(i.personasRut, "persona")} con capa RUT · ${conteo(i.borradores, "borrador previsto", "borradores previstos")}`}
    >
      <p>
        {i.pendientesVinculo} vínculos vigentes de la empresa pendientes de vínculo con instalación;
        no atribuidos a esta instalación ni valorizados.
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
  const texto = (n: number | string | null, pesos = true) =>
    n === null
      ? "Sin dato"
      : typeof n === "string"
        ? (etiquetas[n] ?? n)
        : `${pesos ? "$ " : ""}${new Intl.NumberFormat("es-CL").format(n)}`;
  return (
    <dl className="divide-y divide-border">
      {diferencias.map((d) => {
        const tipos = d.concepto.match(
          /\((bono_fijo|bono_porcentual|ausente) → (bono_fijo|bono_porcentual|ausente)\)$/,
        );
        const antesPesos = tipos ? tipos[1] !== "bono_porcentual" : true;
        const despuesPesos = tipos ? tipos[2] !== "bono_porcentual" : true;
        return (
          <div className="flex flex-wrap justify-between gap-2 py-2" key={d.concepto}>
            <dt className="t-label">{etiquetas[d.concepto] ?? d.concepto}</dt>
            <dd className="t-numeric">
              {d.antes === null && d.despues !== null ? (
                <>Nuevo: {texto(d.despues, despuesPesos)}</>
              ) : (
                <>
                  {texto(d.antes, antesPesos)} → {texto(d.despues, despuesPesos)}
                  {d.diferencia !== null
                    ? ` · diferencia ${texto(d.diferencia, despuesPesos)}`
                    : ""}
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
