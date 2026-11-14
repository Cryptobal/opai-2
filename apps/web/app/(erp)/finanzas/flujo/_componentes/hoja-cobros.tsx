"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, InputFecha, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { type CobroCelda, TEXTO_ORIGEN } from "./cobros-celda";
import { clp, fechaDdMmAaaa } from "./datos";

type Vista = { fecha: string | null; semana: string | null; automatica: boolean };

/** Cobros esperados de una semana: cambiar la fecha de cobro de una factura, con vista previa (CAR-396). */
export function HojaCobros({
  semana,
  cobros,
  onCerrar,
}: {
  semana: string;
  cobros: CobroCelda[];
  onCerrar: () => void;
}) {
  const [elegido, setElegido] = useState<CobroCelda | null>(
    cobros.length === 1 ? (cobros[0] ?? null) : null,
  );
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Cobros esperados"
      descripcion={`Semana ${fechaDdMmAaaa(semana)} · facturas por cobrar`}
      acciones={
        <Button
          variant="secondary"
          onClick={elegido && cobros.length > 1 ? () => setElegido(null) : onCerrar}
        >
          {elegido && cobros.length > 1 ? "Volver" : "Cerrar"}
        </Button>
      }
    >
      {elegido ? (
        <CambiarFecha key={elegido.documentoId} cobro={elegido} onListo={onCerrar} />
      ) : (
        <ul className="flex flex-col gap-2">
          {cobros.map((c) => (
            <li
              key={c.documentoId}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{c.etiqueta}</p>
                <p className="text-sm text-fg-muted">
                  {c.fechaEsperada
                    ? `${fechaDdMmAaaa(c.fechaEsperada)} · ${TEXTO_ORIGEN[c.origen]}`
                    : TEXTO_ORIGEN[c.origen]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm tabular-nums whitespace-nowrap text-fg">
                  {clp(c.monto)}
                </span>
                <Button variant="secondary" onClick={() => setElegido(c)}>
                  Cambiar fecha
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function CambiarFecha({ cobro, onListo }: { cobro: CobroCelda; onListo: () => void }) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [fecha, setFecha] = useState(cobro.fechaEsperada ?? "");
  const [vista, setVista] = useState<Vista | null>(null);

  const entrada = (automatica: boolean) => ({
    documentoId: cobro.documentoId,
    ...(automatica ? {} : { fecha }),
  });

  async function revisar(automatica: boolean) {
    limpiarError();
    setVista(
      await ejecutar<Vista>(
        "finanzas.cobros.fijar_fecha_esperada",
        entrada(automatica),
        true,
        "ninguna",
      ),
    );
  }

  async function confirmar() {
    if (!vista) return;
    const r = await ejecutar<Vista>(
      "finanzas.cobros.fijar_fecha_esperada",
      entrada(vista.automatica),
    );
    if (!r) return;
    avisar.exito(
      r.automatica ? "El cobro vuelve a su fecha automática" : "Fecha de cobro cambiada",
    );
    onListo();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-fg">{cobro.etiqueta}</p>
        <p className="text-sm tabular-nums text-fg-muted">
          {clp(cobro.monto)} · hoy se espera{" "}
          {cobro.fechaEsperada ? fechaDdMmAaaa(cobro.fechaEsperada) : "sin fecha"} (
          {TEXTO_ORIGEN[cobro.origen]})
        </p>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <Campo etiqueta="Nueva fecha esperada de cobro" htmlFor="cobro-fecha">
        <InputFecha
          id="cobro-fecha"
          valor={fecha}
          onCambiar={(v) => {
            setFecha(v);
            setVista(null);
          }}
        />
      </Campo>
      {vista ? (
        <Alerta tono="info" titulo="Revisa el cambio">
          {vista.automatica
            ? "Vuelve a la fecha automática (promedio de pago del cliente o vencimiento)."
            : `El cobro pasa a la semana del ${fechaDdMmAaaa(vista.semana ?? "")}. Una fecha ya pasada se cuenta en la semana en curso.`}
        </Alerta>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {vista ? (
          <Button disabled={pendiente} onClick={() => void confirmar()}>
            {pendiente ? "Guardando…" : "Confirmar"}
          </Button>
        ) : (
          <Button disabled={pendiente || !fecha} onClick={() => void revisar(false)}>
            Revisar cambio
          </Button>
        )}
        {cobro.origen === "manual" && !vista ? (
          <Button variant="secondary" disabled={pendiente} onClick={() => void revisar(true)}>
            Volver a la fecha automática
          </Button>
        ) : null}
      </div>
    </div>
  );
}
