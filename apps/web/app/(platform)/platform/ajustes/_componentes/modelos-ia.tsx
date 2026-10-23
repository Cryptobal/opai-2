"use client";

import { Input, SeccionTarjeta, Select } from "@opai/ds";

import type { ModelosIa } from "./tipos";

const CLASES = [
  { id: "economica", etiqueta: "Económica", ayuda: "Clasificar, extraer" },
  { id: "estandar", etiqueta: "Estándar", ayuda: "Redactar, resumir" },
  { id: "potente", etiqueta: "Potente", ayuda: "Licitaciones, análisis" },
] as const;

const PROVEEDORES = [
  { valor: "ia_anthropic", etiqueta: "Anthropic" },
  { valor: "ia_openai", etiqueta: "OpenAI" },
  { valor: "ia_google", etiqueta: "Google" },
];

/** Modelos de IA por clase de tarea (50): por defecto en la modalidad De plataforma. */
export function ModelosIaCard({
  v,
  onCambiar,
}: {
  v: ModelosIa;
  onCambiar: (v: ModelosIa) => void;
}) {
  return (
    <SeccionTarjeta titulo="Modelos de IA por clase" sinRelleno>
      <ul>
        {CLASES.map((c) => (
          <li
            key={c.id}
            className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[120px_150px_minmax(0,1fr)] sm:items-center"
          >
            <span className="flex flex-col">
              <span className="text-base font-medium text-fg">{c.etiqueta}</span>
              <span className="t-caption">{c.ayuda}</span>
            </span>
            <Select
              aria-label={`Proveedor ${c.etiqueta}`}
              valor={v[c.id].proveedor}
              opciones={PROVEEDORES}
              onCambiar={(p) => onCambiar({ ...v, [c.id]: { ...v[c.id], proveedor: p } })}
            />
            <Input
              aria-label={`Modelo ${c.etiqueta}`}
              className="t-mono"
              value={v[c.id].modelo}
              onChange={(e) => onCambiar({ ...v, [c.id]: { ...v[c.id], modelo: e.target.value } })}
            />
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}
