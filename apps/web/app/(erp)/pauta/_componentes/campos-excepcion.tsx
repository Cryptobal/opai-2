import { Button, Campo, Input, InputFecha, Select } from "@opai/ds";

const TIPOS = [
  { valor: "ausencia", etiqueta: "Ausencia" },
  { valor: "licencia", etiqueta: "Licencia médica" },
  { valor: "vacaciones", etiqueta: "Vacaciones" },
  { valor: "permiso", etiqueta: "Permiso" },
] as const;

export function CamposExcepcionMensual({
  tipo,
  setTipo,
  hasta,
  setHasta,
  motivo,
  setMotivo,
}: {
  tipo: string;
  setTipo: (v: string) => void;
  hasta: string;
  setHasta: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
}) {
  return (
    <>
      <Campo etiqueta="Tipo" htmlFor="ex-tipo">
        <Select id="ex-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
      </Campo>
      <Campo
        etiqueta="Hasta"
        htmlFor="ex-hasta"
        ayuda="Para varios días seguidos. Los días libres del puesto no cuentan."
      >
        <InputFecha id="ex-hasta" valor={hasta} onCambiar={setHasta} />
      </Campo>
      <Campo etiqueta="Motivo" htmlFor="ex-motivo">
        <Input
          id="ex-motivo"
          value={motivo}
          placeholder="Licencia médica folio…"
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Campo>
    </>
  );
}

export function CamposExcepcionDiaria({
  tipo,
  setTipo,
  hasta,
  setHasta,
  motivo,
  setMotivo,
  fecha,
  pendiente,
  onRegistrar,
}: {
  tipo: string;
  setTipo: (v: string) => void;
  hasta: string;
  setHasta: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  fecha: string;
  pendiente: boolean;
  onRegistrar: () => void;
}) {
  return (
    <>
      <p className="t-label">Registrar ausencia</p>
      <Campo etiqueta="Tipo" htmlFor="ex-tipo-d">
        <Select id="ex-tipo-d" valor={tipo} onCambiar={setTipo} opciones={TIPOS} />
      </Campo>
      <Campo etiqueta="Hasta" htmlFor="ex-hasta-d">
        <InputFecha id="ex-hasta-d" valor={hasta} onCambiar={setHasta} />
      </Campo>
      <Campo etiqueta="Motivo" htmlFor="ex-motivo-d">
        <Input id="ex-motivo-d" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      <Button onClick={onRegistrar} cargando={pendiente} disabled={motivo.trim().length < 3 || hasta < fecha}>
        Registrar excepción
      </Button>
    </>
  );
}
