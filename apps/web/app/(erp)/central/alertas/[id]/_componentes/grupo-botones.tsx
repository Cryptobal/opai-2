import { Button } from "@opai/ds";

type Props = {
  estado: string;
  pendiente: boolean;
  onResolver: () => void;
  onFalsa: () => void;
  onPosponer: () => void;
  onEscalar: () => void;
  onCargo: () => void;
};

/** Botones de alerta activa (spec §6). */
export function GrupoBotonesActivos({ estado, pendiente, onResolver, onFalsa, onPosponer, onEscalar, onCargo }: Props) {
  const pospuesta = estado === "pospuesta";
  return (
    <>
      {estado !== "en_atencion" && !pospuesta ? (
        <Button variant="primary" disabled={pendiente} onClick={onCargo}>
          Me hago cargo
        </Button>
      ) : null}
      {!pospuesta ? (
        <Button variant={estado === "en_atencion" ? "primary" : "secondary"} disabled={pendiente} onClick={onResolver}>
          Resolver
        </Button>
      ) : null}
      <Button variant="secondary" disabled={pendiente} onClick={onFalsa}>
        Falsa alarma
      </Button>
      {!pospuesta ? (
        <Button variant="secondary" disabled={pendiente} onClick={onPosponer}>
          Posponer
        </Button>
      ) : null}
      {!pospuesta ? (
        <Button variant="secondary" disabled={pendiente} onClick={onEscalar}>
          Escalar
        </Button>
      ) : null}
    </>
  );
}