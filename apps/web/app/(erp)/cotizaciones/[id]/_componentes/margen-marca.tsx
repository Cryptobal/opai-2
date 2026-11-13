"use client";

import { createContext, useContext } from "react";

import { Badge, Button, Segmentado } from "@opai/ds";

import type { ValoresTexto } from "@/lib/instrumentos-valores";

/** Valores por defecto del modelo, para marcar cada campo «Sobrescrito» y poder volver a él (CAR-214). */
export const DefectoCtx = createContext<ValoresTexto | null>(null);

/** Distintivo «Sobrescrito» con el botón para volver al valor por defecto de la empresa. */
export function MarcaSobrescrito({ onVolver }: { onVolver: () => void }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2">
      <Badge tono="warning" punto={false}>Sobrescrito</Badge>
      <Button type="button" variant="ghost" onClick={onVolver}>Volver al valor por defecto</Button>
    </span>
  );
}

type Selector = "garantiaModo" | "rcModo" | "rcPlazo";

/** Selector de modo o plazo que también se marca «Sobrescrito» si difiere del valor de la empresa (CAR-214). */
export function SelectorMarcado<K extends Selector>({
  campo,
  etiqueta,
  v,
  opciones,
  onCambiar,
}: {
  campo: K;
  etiqueta: string;
  v: ValoresTexto;
  opciones: { id: ValoresTexto[K]; etiqueta: string }[];
  onCambiar: (v: ValoresTexto) => void;
}) {
  const defecto = useContext(DefectoCtx);
  const porDefecto = defecto?.[campo];
  const elegir = (id: ValoresTexto[K]) => onCambiar({ ...v, [campo]: id });
  return (
    <div>
      <Segmentado
        etiqueta={etiqueta}
        activa={v[campo]}
        opciones={opciones.map((o) => ({ id: o.id, etiqueta: o.etiqueta, onClick: () => elegir(o.id) }))}
      />
      {porDefecto !== undefined && porDefecto !== v[campo] ? <MarcaSobrescrito onVolver={() => elegir(porDefecto)} /> : null}
    </div>
  );
}
