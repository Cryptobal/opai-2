"use client";

import { lazy, Suspense, useState } from "react";

import { Button, Pares, Seccion } from "@opai/ds";

import { type CargoJefatura, ETIQUETA_VE } from "../../../_componentes/tipos";

const Hoja = lazy(() => import("./hoja-jefatura").then((m) => ({ default: m.HojaJefatura })));

type Props = { cargoId: string; cargos: CargoJefatura[]; editable: boolean };

/** Quién ve los resultados del cargo: a qué cargo reporta y a quiénes ve cada jefe (CAR-314). */
export function Jefatura({ cargoId, cargos, editable }: Props) {
  const cargo = cargos.find((c) => c.id === cargoId);
  // Cada apertura monta la hoja de nuevo, con lo guardado; se descarga al abrirla (ADR-037).
  const [apertura, setApertura] = useState(0);
  const [abierto, setAbierto] = useState(false);
  if (!cargo) return null;
  const jefatura = cargos.find((c) => c.id === cargo.jefaturaCargoId);

  return (
    <Seccion titulo="Quién ve los resultados">
      <div className="flex flex-col items-start gap-3">
        <Pares
          items={[
            { etiqueta: "Reporta a", valor: jefatura?.nombre ?? "Nadie (lo ve gerencia)" },
            ...(jefatura ? [{ etiqueta: "Cada jefe ve", valor: ETIQUETA_VE[cargo.jefaturaVe] }] : []),
          ]}
        />
        {editable ? (
          <Button
            variant="secondary"
            onClick={() => {
              setApertura((n) => n + 1);
              setAbierto(true);
            }}
          >
            Cambiar jefatura
          </Button>
        ) : null}
      </div>
      {abierto ? (
        <Suspense fallback={null}>
          <Hoja key={apertura} cargo={cargo} cargos={cargos} onCerrar={() => setAbierto(false)} />
        </Suspense>
      ) : null}
    </Seccion>
  );
}
