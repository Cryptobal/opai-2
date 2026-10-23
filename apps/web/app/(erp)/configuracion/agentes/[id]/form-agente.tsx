"use client";

import { type ReactNode, useState } from "react";

import { Alerta, avisar, Campo, Input, SeccionTarjeta, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { ApiKeyDetalle } from "../datos";
import { RevocarKey } from "./revocar-key";

const NIVELES = [
  { valor: "aprobacion", etiqueta: "Requiere aprobación" },
  { valor: "directo", etiqueta: "Directo, sin aprobación" },
];

/** "IRREVERSIBLE: termina un vínculo laboral con…" → "Termina un vínculo laboral con…". */
export const accionDe = (d: string) => {
  const t = (d.replace(/^IRREVERSIBLE:\s*/i, "").split(/[.:]\s/)[0] ?? d).trim();
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
};

type Props = { k: ApiKeyDetalle; barra: ReactNode };

/** Presupuesto y autonomía de una key (25); guarda solo lo que cambió. */
export function FormAgente({ k, barra }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [tope, setTope] = useState(k.presupuestoMensualUsd ? String(k.presupuestoMensualUsd) : "");
  const [niveles, setNiveles] = useState(
    () => new Map(k.autonomia.map((a) => [a.capability, a.nivel])),
  );
  const activa = !k.revocadaEn;
  async function guardar() {
    const nuevo = tope ? Number(tope) : null;
    if (nuevo !== k.presupuestoMensualUsd)
      if (!(await ejecutar("core.apikeys.update", { id: k.id, presupuestoMensualUsd: nuevo })))
        return;
    for (const a of k.autonomia) {
      const n = niveles.get(a.capability);
      if (n && n !== a.nivel)
        if (
          !(await ejecutar("core.apikeys.set_autonomia", {
            apiKeyId: k.id,
            capability: a.capability,
            nivel: n === "aprobacion" ? null : n,
          }))
        )
          return;
    }
    avisar.exito("Cambios guardados");
  }
  return (
    <form
      id="form-agente"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <SeccionTarjeta titulo="Presupuesto mensual">
        <Campo
          etiqueta="Tope en US$"
          htmlFor="tope"
          ayuda="Al 80 % avisamos; al 100 % se detiene. Vacío: sin límite."
        >
          <Input
            id="tope"
            inputMode="decimal"
            disabled={!activa}
            value={tope}
            onChange={(e) => setTope(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </Campo>
        <div className="mt-3">{barra}</div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Autonomía">
        <p className="t-caption mb-3">
          ADR-032 · Lectura libre; escritura con vista previa; irreversible con aprobación salvo que
          la autorices aquí.
        </p>
        {k.autonomia.length === 0 ? (
          <p className="text-base text-fg-muted">Sus scopes no incluyen acciones irreversibles.</p>
        ) : (
          <ul className="flex flex-col">
            {k.autonomia.map((a) => (
              <li
                key={a.capability}
                className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-medium text-fg">{accionDe(a.descripcion)}</span>
                  <span className="t-mono t-caption">{a.capability}</span>
                </span>
                <Select
                  aria-label={`Autonomía para ${a.capability}`}
                  className="md:w-64"
                  disabled={!activa}
                  valor={niveles.get(a.capability) ?? "aprobacion"}
                  onCambiar={(v) =>
                    setNiveles((m) =>
                      new Map(m).set(a.capability, v === "directo" ? "directo" : "aprobacion"),
                    )
                  }
                  opciones={NIVELES}
                />
              </li>
            ))}
          </ul>
        )}
      </SeccionTarjeta>
      {activa ? <RevocarKey id={k.id} nombre={k.nombre} /> : null}
      {pendiente ? <p className="t-caption">Guardando…</p> : null}
    </form>
  );
}
