"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, Campo, Combobox, ParesGrid, RadioGroup } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

export type Previa = {
  comparacion: { campo: string; etiqueta: string; esta: string | null; duplicado: string | null; queda: "esta" | "duplicado" }[];
  mueve: { contactos: number; instalaciones: number; negocios: number; documentos: number; actividad: number; facturas: number };
};
type Opcion = { valor: string; etiqueta: string };

const PASOS = ["Elegir", "Comparar", "Resumen"];

/** Barras de progreso de los pasos (diseño: una barra por paso, la actual destacada). */
export function PasosFusion({ actual }: { actual: number }) {
  return (
    <ol className="grid grid-cols-3 gap-1" aria-label="Pasos">
      {PASOS.map((p, i) => (
        <li key={p} className="flex flex-col gap-1.5" {...(i === actual ? { "aria-current": "step" as const } : {})}>
          <span className={`h-1 rounded-full ${i <= actual ? "bg-fg" : "bg-border"}`} />
          <span className={`t-caption ${i === actual ? "font-medium text-fg" : ""}`}>{p}</span>
        </li>
      ))}
    </ol>
  );
}

async function buscar(q: string, excepto: string): Promise<Opcion[]> {
  const r = await ejecutarCapacidad("erp", "core.cuentas.list", { q: q.trim() || undefined, limite: 20 }).catch(() => null);
  if (!r?.ok) return [];
  const items = (r.data as { items: { id: string; nombre: string; rut: string | null }[] }).items;
  return items
    .filter((c) => c.id !== excepto)
    .map((c) => ({ valor: c.id, etiqueta: c.rut ? `${c.nombre} · ${c.rut}` : c.nombre }));
}

/** Paso 1: buscar el duplicado por nombre o RUT; parte con las cuentas de nombre parecido. */
export function ElegirDuplicado(p: {
  cuenta: CuentaDetalle;
  elegido: { id: string; nombre: string } | null;
  onElegir: (d: { id: string; nombre: string } | null) => void;
}) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const onBuscar = useCallback(
    async (q: string) => {
      const o = await buscar(q, p.cuenta.id);
      setOpciones((prev) => [...prev, ...o.filter((x) => !prev.some((v) => v.valor === x.valor))]);
      return o;
    },
    [p.cuenta.id],
  );
  // Sugeridos al abrir: cuentas cuyo nombre comparte la primera palabra con esta.
  useEffect(() => {
    void buscar(p.cuenta.nombre.split(/\s+/)[0] ?? "", p.cuenta.id).then(setOpciones);
  }, [p.cuenta.id, p.cuenta.nombre]);
  return (
    <Campo etiqueta="Cuenta duplicada" htmlFor="fusion-duplicado" ayuda="Busca por nombre o RUT. Esta cuenta es la que queda.">
      <Combobox
        id="fusion-duplicado"
        valor={p.elegido?.id ?? ""}
        onCambiar={([v]) => {
          const o = opciones.find((x) => x.valor === v);
          p.onElegir(o ? { id: o.valor, nombre: o.etiqueta.split(" · ")[0] ?? o.etiqueta } : null);
        }}
        opciones={opciones}
        onBuscar={onBuscar}
        placeholder="Buscar cuenta por nombre o RUT"
      />
    </Campo>
  );
}

/** Paso 2: por campo, qué valor queda (solo los que difieren; el resto no cambia). */
export function CompararFusion(p: {
  previa: Previa;
  elegir: Record<string, "esta" | "duplicado">;
  onElegir: (campo: string, lado: "esta" | "duplicado") => void;
}) {
  const distintos = p.previa.comparacion.filter((c) => c.esta !== c.duplicado);
  if (distintos.length === 0)
    return <Alerta tono="info" titulo="Los datos de las dos cuentas son iguales; no hay nada que elegir." />;
  return (
    <div className="flex flex-col gap-4">
      {distintos.map((c) => (
        <RadioGroup
          key={c.campo}
          etiqueta={c.etiqueta}
          orientacion="fila"
          valor={p.elegir[c.campo] ?? c.queda}
          onCambiar={(v) => p.onElegir(c.campo, v as "esta" | "duplicado")}
          opciones={[
            { valor: "esta", etiqueta: c.esta ?? "Vacío", descripcion: `${c.etiqueta} · esta cuenta` },
            { valor: "duplicado", etiqueta: c.duplicado ?? "Vacío", descripcion: `${c.etiqueta} · duplicado` },
          ]}
        />
      ))}
    </div>
  );
}

const MUEVE: [keyof Previa["mueve"], string][] = [
  ["contactos", "Contactos"],
  ["instalaciones", "Instalaciones"],
  ["negocios", "Negocios"],
  ["documentos", "Documentos"],
  ["actividad", "Actividad"],
  ["facturas", "Facturas"],
];

/** Paso 3: qué pasa a la cuenta que queda y el aviso de que no se puede deshacer. */
export function ResumenFusion(p: { previa: Previa; queda: string; duplicado: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="t-body-sm">Se mueven a «{p.queda}» y «{p.duplicado}» se elimina:</p>
      <ParesGrid items={MUEVE.map(([k, etiqueta]) => ({ etiqueta, valor: String(p.previa.mueve[k]) }))} />
      <Alerta
        tono="danger"
        titulo="Fusionar no se puede deshacer. El duplicado deja de existir; su historial queda en esta cuenta."
      />
    </div>
  );
}
