"use client";

import { Input, SeccionTarjeta } from "@opai/ds";

import type { Integracion } from "./tipos";

type Config = Record<string, unknown>;
type Modelos = Partial<Record<"economica" | "estandar" | "potente", string>>;

const CLASES = [
  { id: "economica", nombre: "Económica", uso: "Clasificar, extraer" },
  { id: "estandar", nombre: "Estándar", uso: "Redactar, resumir" },
  { id: "potente", nombre: "Potente", uso: "Licitaciones, análisis" },
] as const;

type Props = {
  items: Integracion[];
  configs: Record<string, Config>;
  onCambiar: (proveedor: string, c: Config) => void;
};

/**
 * Clase de tarea (29): modelo de cada clase por proveedor configurado. Vacío = el modelo que fija
 * OPAI. Se usa el primer proveedor con credencial (Anthropic, OpenAI, Google).
 */
export function ModelosIa({ items, configs, onCambiar }: Props) {
  const activos = items.filter((i) => i.estado === "configurada" || i.estado === "error");
  return (
    <SeccionTarjeta titulo="Clase de tarea" sinRelleno>
      {activos.length === 0 ? (
        <p className="px-4 py-4 text-base text-fg-muted">
          Guarda la credencial de un proveedor para elegir sus modelos.
        </p>
      ) : (
        <ul>
          {CLASES.map((c) => (
            <li
              key={c.id}
              className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center"
            >
              <span className="flex flex-col">
                <span className="text-base font-medium text-fg">{c.nombre}</span>
                <span className="t-caption">{c.uso}</span>
              </span>
              <span className="flex flex-col gap-2">
                {activos.map((i) => {
                  const config = configs[i.proveedor] ?? {};
                  const modelos = (config["modelos"] ?? {}) as Modelos;
                  return (
                    <Input
                      key={i.proveedor}
                      aria-label={`${i.nombre}: modelo ${c.nombre.toLowerCase()}`}
                      placeholder={`${i.nombre.replace(/^IA · /, "")} · modelo por defecto`}
                      value={modelos[c.id] ?? ""}
                      onChange={(e) =>
                        onCambiar(i.proveedor, {
                          ...config,
                          modelos: { ...modelos, [c.id]: e.target.value || undefined },
                        })
                      }
                    />
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SeccionTarjeta>
  );
}
