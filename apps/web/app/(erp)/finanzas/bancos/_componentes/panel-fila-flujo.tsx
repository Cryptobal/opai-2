import { Alerta, Button, Campo, Combobox, Input, Switch } from "@opai/ds";

import type { Destinos, EleccionFila, SugerenciaRegla } from "./destinos";

/**
 * Reconocer contra una fila del flujo y, opcional, una cuenta contable (CAR-328). Las reglas que calzan se
 * ofrecen arriba; la persona puede crear una regla nueva con este movimiento en el mismo paso.
 */
export function PanelFilaFlujo({
  esAbono,
  sinDestinos,
  onReintentar,
  destinos,
  reglas,
  eleccion,
  onEleccion,
}: {
  esAbono: boolean;
  sinDestinos: boolean;
  onReintentar: () => void;
  destinos: Destinos | null;
  reglas: SugerenciaRegla[];
  eleccion: EleccionFila;
  onEleccion: (e: EleccionFila) => void;
}) {
  const seccion = esAbono ? "ingreso" : "egreso";
  const filas = (destinos?.filas ?? []).filter((f) => f.seccion === seccion);
  const set = (p: Partial<EleccionFila>) => onEleccion({ ...eleccion, ...p });
  if (sinDestinos) {
    return (
      <Alerta tono="danger" titulo="No pudimos cargar las filas del flujo">
        <Button variant="secondary" onClick={onReintentar}>
          Reintentar
        </Button>
      </Alerta>
    );
  }
  if (destinos && filas.length === 0) {
    return (
      <Alerta tono="info" titulo={`No hay filas de ${esAbono ? "ingresos" : "egresos"} en el flujo de caja`}>
        Créalas en Finanzas › Flujo de caja y vuelve a reconocer este movimiento.
      </Alerta>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {reglas.length ? (
        <ul className="flex flex-col gap-2" aria-label="Reglas que calzan">
          {reglas.map((r) => {
            const elegida = eleccion.filaId === r.flujoFilaId && eleccion.cuentaId === r.cuentaContableId;
            return (
              <li key={r.reglaId} className="rowcard flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm font-medium">Regla «{r.nombre}»</p>
                  <p className="t-caption text-fg-muted">
                    {r.filaEtiqueta}
                    {r.cuentaContable ? ` · ${r.cuentaContable}` : ""}
                  </p>
                </div>
                <Button
                  variant={elegida ? "ghost" : "secondary"}
                  onClick={() => set({ filaId: r.flujoFilaId, cuentaId: r.cuentaContableId, crearRegla: false })}
                >
                  {elegida ? "Elegida" : "Usar"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Campo etiqueta={esAbono ? "Fila de ingresos del flujo" : "Fila de egresos del flujo"} htmlFor="reconocer-fila">
        <Combobox
          id="reconocer-fila"
          aria-label="Fila del flujo"
          placeholder={destinos ? "Elige la fila" : "Cargando filas…"}
          disabled={!destinos}
          valor={eleccion.filaId}
          opciones={filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))}
          onCambiar={(v) => set({ filaId: v[0] ?? null })}
        />
      </Campo>
      <Campo etiqueta="Cuenta contable (opcional)" htmlFor="reconocer-cuenta" ayuda="Para la contabilidad; el flujo usa la fila.">
        <Combobox
          id="reconocer-cuenta"
          aria-label="Cuenta contable"
          placeholder={destinos?.cuentas.length === 0 ? "Sin plan de cuentas" : "Sin cuenta"}
          disabled={!destinos || destinos.cuentas.length === 0}
          valor={eleccion.cuentaId}
          opciones={(destinos?.cuentas ?? []).map((c) => ({ valor: c.id, etiqueta: `${c.codigo} ${c.nombre}` }))}
          onCambiar={(v) => set({ cuentaId: v[0] ?? null })}
        />
      </Campo>
      <Switch
        etiqueta="Crear una regla con este movimiento"
        descripcion="Los próximos movimientos con esa glosa quedarán sugeridos a esta fila."
        activo={eleccion.crearRegla}
        onCambiar={(v) => set({ crearRegla: v })}
      />
      {eleccion.crearRegla ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre de la regla" htmlFor="regla-nombre">
            <Input id="regla-nombre" value={eleccion.nombreRegla} onChange={(e) => set({ nombreRegla: e.target.value })} />
          </Campo>
          <Campo etiqueta="La glosa contiene" htmlFor="regla-glosa">
            <Input id="regla-glosa" value={eleccion.glosaContiene} onChange={(e) => set({ glosaContiene: e.target.value })} />
          </Campo>
        </div>
      ) : null}
    </div>
  );
}
