"use client";

import { useState } from "react";

import { avisar, Button, Sheet, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import {
  type IndicadorOpcion,
  type ItemScorecard,
  mesCorto,
  type Scorecard,
} from "../../../_componentes/tipos";
import { FilasScorecard } from "./filas-scorecard";

type Props = {
  cargoId: string;
  base: Scorecard | null;
  /** Hay un cambio ya publicado que rige más adelante: no admite borrador, solo volver a publicar. */
  soloPublicar: boolean;
  opciones: IndicadorOpcion[];
  onCerrar: () => void;
};

/**
 * Edita el scorecard del cargo (`desempeno.scorecards.guardar`). Parte del borrador o del cambio
 * pendiente si existe; si no, de la versión vigente. Guardar deja un borrador; publicar exige que los
 * pesos sumen 100 y rige desde el mes que indica la respuesta (nunca cambia un mes ya medido).
 */
export function HojaScorecard({ cargoId, base, soloPublicar, opciones, onCerrar }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [items, setItems] = useState<ItemScorecard[]>(base?.indicadores ?? []);
  const [veResultado, setVeResultado] = useState(base?.personaVeResultado ?? true);
  // La posición en el equipo aún no se muestra en ninguna pantalla: se conserva lo guardado, sin ofrecerlo.
  const veRanking = base?.personaVeRanking ?? false;
  const suma = items.reduce((s, i) => s + (Number.isFinite(i.peso) ? i.peso : 0), 0);
  const completos = items.every((i) => i.meta > 0 && Number.isInteger(i.peso) && i.peso >= 1);

  async function guardar(publicar: boolean) {
    const r = await ejecutar<Scorecard>("desempeno.scorecards.guardar", {
      cargoId,
      indicadores: items,
      personaVeResultado: veResultado,
      personaVeRanking: veResultado && veRanking,
      publicar,
    });
    if (!r) return;
    avisar.exito(publicar ? `Publicado: rige desde ${mesCorto(r.vigenteDesde)}` : "Borrador guardado");
    onCerrar();
  }

  return (
    <Sheet
        abierto
        onCerrar={onCerrar}
        titulo="Scorecard del cargo"
        acciones={
          <>
            <Button
              variant="secondary"
              disabled={pendiente || !completos || soloPublicar}
              onClick={() => void guardar(false)}
            >
              Guardar borrador
            </Button>
            <Button
              disabled={pendiente || !completos || items.length === 0 || suma !== 100}
              onClick={() => void guardar(true)}
            >
              {pendiente ? "Guardando…" : "Publicar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FilasScorecard items={items} opciones={opciones} onCambiar={setItems} />
          <p
            className={suma === 100 ? "t-caption" : "t-caption text-warning-fg"}
            aria-live="polite"
          >
            Los pesos suman {suma} %. {suma === 100 ? "" : "Para publicar deben sumar 100 %."}
          </p>
          <Switch
            activo={veResultado}
            onCambiar={setVeResultado}
            etiqueta="La persona ve su resultado"
            descripcion="Cada persona de este cargo ve su puntaje y sus indicadores."
          />
          {completos ? null : (
            <p className="t-caption text-warning-fg">Completa la meta y el peso de cada indicador.</p>
          )}
          <p className="t-caption">
            {soloPublicar
              ? "Ya hay un cambio publicado para el mes siguiente: al publicar de nuevo lo reemplazas."
              : "Si el cargo ya tiene un scorecard en uso, lo que publiques empieza el mes siguiente."}
          </p>
          {error ? (
            <p role="alert" className="t-body-sm text-danger-fg">
              {error}
            </p>
          ) : null}
        </div>
    </Sheet>
  );
}
