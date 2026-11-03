"use client";

import { Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Persona = { id: string; nombres: string; apellidos: string };

/** Búsqueda remota de personas por nombre o RUT (`core.personas.list`, lectura auditada del Núcleo). */
export function CampoPersona({ id, valor, onCambiar, invalido }: {
  id: string;
  valor: string | null;
  onCambiar: (personaId: string | null) => void;
  invalido?: boolean;
}) {
  async function buscar(q: string) {
    const r = await ejecutarCapacidad("erp", "core.personas.list", { q, limite: 20 }, false, "ninguna");
    if (!r.ok) return [];
    return (r.data as { items: Persona[] }).items.map((p) => ({
      valor: p.id,
      etiqueta: `${p.apellidos}, ${p.nombres}`,
    }));
  }
  return (
    <Combobox
      id={id}
      opciones={[]}
      valor={valor}
      onCambiar={(v) => onCambiar(v[0] ?? null)}
      onBuscar={buscar}
      {...(invalido ? { invalido } : {})}
      placeholder="Buscar por nombre o RUT"
      textoInicial="Escribe un nombre o RUT"
    />
  );
}
