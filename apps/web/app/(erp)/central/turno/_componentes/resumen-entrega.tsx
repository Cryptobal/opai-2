type Props = { alertasTomadas: number; propuestasPendientes: number };

export function ResumenEntrega({ alertasTomadas, propuestasPendientes }: Props) {
  if (alertasTomadas === 0 && propuestasPendientes === 0) return null;
  return (
    <p className="t-caption text-fg-muted">
      Al entregar el turno quedan{" "}
      {alertasTomadas > 0 ? `${alertasTomadas} alerta${alertasTomadas === 1 ? "" : "s"} tomadas por ti` : null}
      {alertasTomadas > 0 && propuestasPendientes > 0 ? " y " : null}
      {propuestasPendientes > 0
        ? `${propuestasPendientes} propuesta${propuestasPendientes === 1 ? "" : "s"} del agente por revisar`
        : null}
      . La persona que acepte el turno hereda las alertas tomadas.
    </p>
  );
}