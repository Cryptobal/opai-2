"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ModelosIaCard } from "./modelos-ia";
import { TablaPrecios } from "./tabla-precios";
import { type Ajuste, aMicro, aUsd, esModelosIa, type ModelosIa, type Precio } from "./tipos";

type Props = { precios: Precio[]; ajustes: Ajuste[] };

/** Ajustes de plataforma (50): precios, modelos de IA por clase y límites; un solo "Guardar". */
export function AjustesPlataforma({ precios, ajustes }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [txtPrecios, setTxtPrecios] = useState(() =>
    Object.fromEntries(precios.map((p) => [p.recurso, aUsd(p.costoUnitarioMicro)])),
  );
  const modelosIni = ajustes.find((a) => a.clave === "ia_modelos")?.valor;
  const [modelos, setModelos] = useState<ModelosIa | null>(
    esModelosIa(modelosIni) ? modelosIni : null,
  );
  const numericos = ajustes.filter((a) => typeof a.valor === "number");
  const [nums, setNums] = useState(() =>
    Object.fromEntries(numericos.map((a) => [a.clave, String(a.valor)])),
  );
  const invalidos = new Set(
    precios.filter((p) => aMicro(txtPrecios[p.recurso] ?? "") === null).map((p) => p.recurso),
  );
  const numMalo = numericos.some((a) => !Number.isInteger(Number(nums[a.clave])));

  async function guardar() {
    let cambios = 0;
    for (const p of precios) {
      const micro = aMicro(txtPrecios[p.recurso] ?? "");
      if (micro === null || micro === p.costoUnitarioMicro) continue;
      if (
        !(await ejecutar("platform.precios.set", {
          recurso: p.recurso,
          unidad: p.unidad,
          costoUnitarioMicro: micro,
        }))
      )
        return;
      cambios++;
    }
    if (modelos && JSON.stringify(modelos) !== JSON.stringify(modelosIni)) {
      if (
        !(await ejecutar("platform.ajustes.set", {
          modulo: "core",
          clave: "ia_modelos",
          valor: modelos,
        }))
      )
        return;
      cambios++;
    }
    for (const a of numericos) {
      const n = Number(nums[a.clave]);
      if (n === a.valor) continue;
      if (!(await ejecutar("platform.ajustes.set", { modulo: a.modulo, clave: a.clave, valor: n })))
        return;
      cambios++;
    }
    avisar.exito(cambios ? "Ajustes guardados" : "Sin cambios");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="t-caption">Afecta a todas las empresas</span>
        <Button
          disabled={pendiente || invalidos.size > 0 || numMalo}
          onClick={() => void guardar()}
        >
          {pendiente ? "Guardando…" : "Guardar"}
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
    </div>
  );
}
