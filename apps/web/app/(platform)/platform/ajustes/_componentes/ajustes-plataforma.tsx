"use client";

import { lazy, Suspense, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { aLote, type Cambio, cambiosPendientes, FUERA_DE_LIMITES } from "./cambios";
import { ModelosIaCard } from "./modelos-ia";
import { TablaPrecios } from "./tabla-precios";
import { type Ajuste, aMicro, aUsd, esModelosIa, type ModelosIa, type Precio } from "./tipos";

const ConfirmarAjustes = lazy(() => import("./confirmar-ajustes"));

type Props = { precios: Precio[]; ajustes: Ajuste[]; empresas: number | null };

/**
 * Ajustes de plataforma (50): precios, modelos de IA por clase y límites; un solo «Guardar». Todo o
 * nada: la vista previa revisa todos los cambios y se confirma cuántas empresas afectan (CAR-323); al
 * confirmar, `platform.ajustes.guardar_lote` los escribe en una sola transacción (CAR-329).
 */
export function AjustesPlataforma({ precios, ajustes, empresas }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [txtPrecios, setTxtPrecios] = useState(() =>
    Object.fromEntries(precios.map((p) => [p.recurso, aUsd(p.costoUnitarioMicro)])),
  );
  const modelosIni = ajustes.find((a) => a.clave === "ia_modelos")?.valor;
  const [modelos, setModelos] = useState<ModelosIa | null>(
    esModelosIa(modelosIni) ? modelosIni : null,
  );
  const numericos = ajustes.filter(
    (a) => typeof a.valor === "number" && !FUERA_DE_LIMITES.has(a.clave),
  );
  const [porConfirmar, setPorConfirmar] = useState<Cambio[] | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [nums, setNums] = useState(() =>
    Object.fromEntries(numericos.map((a) => [a.clave, String(a.valor)])),
  );
  const invalidos = new Set(
    precios.filter((p) => aMicro(txtPrecios[p.recurso] ?? "") === null).map((p) => p.recurso),
  );
  const numMalo = numericos.some((a) => !Number.isInteger(Number(nums[a.clave])));

  const lote = (cambios: Cambio[], dryRun = false) =>
    ejecutar("platform.ajustes.guardar_lote", aLote(cambios), dryRun);

  async function revisar() {
    const cambios = cambiosPendientes(precios, txtPrecios, modelos, modelosIni, numericos, nums);
    if (!cambios.length) return avisar.exito("Sin cambios");
    setRevisando(true);
    try {
      if ((await lote(cambios, true)) !== null) setPorConfirmar(cambios);
    } finally {
      setRevisando(false);
    }
  }

  async function guardar(cambios: Cambio[]) {
    setPorConfirmar(null);
    if ((await lote(cambios)) !== null) avisar.exito("Ajustes guardados");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="t-caption">Afecta a todas las empresas</span>
        <Button
          disabled={pendiente || invalidos.size > 0 || numMalo}
          onClick={() => void revisar()}
        >
          {revisando ? "Revisando…" : pendiente ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <TablaPrecios
            precios={precios}
            valores={txtPrecios}
            invalidos={invalidos}
            onCambiar={(r, t) => setTxtPrecios((v) => ({ ...v, [r]: t }))}
          />
          {modelos ? <ModelosIaCard v={modelos} onCambiar={setModelos} /> : null}
        </div>
        <SeccionTarjeta titulo="Límites">
          <div className="flex flex-col gap-4">
            <p className="t-caption">El ingreso mínimo se edita en Valores legales.</p>
            {numericos.map((a) => (
              <Campo
                key={a.clave}
                etiqueta={a.etiqueta}
                htmlFor={`aj-${a.clave}`}
                ayuda={`Por defecto ${String(a.porDefecto)} · versión ${a.version}`}
              >
                <Input
                  id={`aj-${a.clave}`}
                  inputMode="numeric"
                  className="t-numeric"
                  value={nums[a.clave] ?? ""}
                  onChange={(e) =>
                    setNums((v) => ({ ...v, [a.clave]: e.target.value.replace(/\D/g, "") }))
                  }
                />
              </Campo>
            ))}
          </div>
        </SeccionTarjeta>
      </div>
      {porConfirmar ? (
        <Suspense fallback={null}>
          <ConfirmarAjustes
            cambios={porConfirmar.length}
            empresas={empresas}
            pendiente={pendiente}
            onCancelar={() => setPorConfirmar(null)}
            onGuardar={() => void guardar(porConfirmar)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
