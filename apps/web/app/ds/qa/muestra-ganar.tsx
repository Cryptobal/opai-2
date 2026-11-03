import { EfectosGanarLista, type EfectosGanar } from "../../(erp)/negocios/_componentes/hojas/efectos-ganar";

const EFECTOS: EfectosGanar = {
  cuenta: { id: "c", nombre: "Agrícola Los Andes S.A.", desde: "prospecto", hacia: "cliente_activo" },
  instalaciones: [
    { id: "i1", nombre: "Bodega Sur", desde: "prospecto" },
    { id: "i2", nombre: "Planta Norte", desde: "prospecto" },
  ],
  cotizacion: { id: "q", versionId: "v", codigo: "CPQ-2026-127", version: 2 },
  rechazadas: 1,
  puestosPorOfrecer: 4,
};

/** Hoja ganar (GanarNegocio, CRM v3 cierre §3.6): vista previa, cargando y sin efectos. */
export function MuestraGanar() {
  return (
    <div className="grid gap-6 md:grid-cols-3" data-testid="muestra-ganar">
      <EfectosGanarLista efectos={EFECTOS} inicio="2026-12-01" />
      <EfectosGanarLista efectos={null} inicio={null} />
      <EfectosGanarLista
        efectos={{ cuenta: null, instalaciones: [], cotizacion: null, rechazadas: 0, puestosPorOfrecer: 0 }}
        inicio={null}
      />
    </div>
  );
}
