"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, Textarea } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type TextoTipo = { tipo: string; nombre: string; texto: string };

/** Un campo por sección; se guarda (y publica) al salir del campo si el texto cambió. */
export function TextosTipoPropuesta({ tipos }: { tipos: TextoTipo[] }) {
  const { ejecutar, error } = useCapacidad("erp");
  const [guardados, setGuardados] = useState(() => Object.fromEntries(tipos.map((t) => [t.tipo, t.texto])));
  async function guardar(t: TextoTipo, texto: string) {
    if (texto === (guardados[t.tipo] ?? "")) return;
    const r = await ejecutar("cpq.biblioteca_bloques.guardar_texto_tipo", { tipo: t.tipo, texto }, false, "ninguna");
    if (!r) return;
    setGuardados((g) => ({ ...g, [t.tipo]: texto }));
    avisar.exito(`Texto tipo de «${t.nombre}» guardado`);
  }
  return (
    <div className="space-y-3">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {tipos.map((t) => (
        <Campo key={t.tipo} etiqueta={t.nombre} htmlFor={`texto-tipo-${t.tipo}`}>
          <Textarea
            id={`texto-tipo-${t.tipo}`}
            rows={3}
            placeholder="Sin texto tipo: la sección sale vacía hasta que el ejecutivo escriba."
            defaultValue={t.texto}
            onBlur={(e) => void guardar(t, e.target.value.trim())}
          />
        </Campo>
      ))}
    </div>
  );
}
