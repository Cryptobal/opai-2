"use client";

import { Input, Textarea } from "@opai/ds";

import type { BloqueArmador } from "@/lib/cpq-bloques-propuesta";

type Cambio = { contenidoOverride?: string | null; titulo?: string };

/**
 * Texto de una sección, editable en el mismo lugar: se guarda al salir del campo si cambió. Vacío vuelve al texto
 * tipo de la empresa. «Texto libre» lleva además su título, porque puede haber varios.
 */
export function TextoSeccionPropuesta(p: {
  bloque: BloqueArmador;
  nombre: string;
  textoPorDefecto: string;
  onGuardar: (cambio: Cambio) => void;
}) {
  const propio = p.bloque.contenidoOverride ?? null;
  const visible = propio ?? p.textoPorDefecto;
  return (
    <div className="space-y-2">
      {p.bloque.tipo === "texto_libre" ? (
        <Input
          key={`t:${p.bloque.titulo ?? ""}`}
          aria-label={`Título de ${p.nombre}`}
          placeholder="Título de la sección"
          defaultValue={p.bloque.titulo ?? ""}
          onBlur={(e) => {
            const titulo = e.target.value.trim();
            if (titulo !== (p.bloque.titulo ?? "")) p.onGuardar({ titulo });
          }}
        />
      ) : null}
      <Textarea
        key={`c:${visible}`}
        aria-label={`Texto de ${p.nombre}`}
        rows={Math.min(12, Math.max(3, visible.split("\n").length + 1))}
        placeholder="Escribe el texto de esta sección."
        defaultValue={visible}
        onBlur={(e) => {
          const texto = e.target.value.trim();
          if (texto === visible.trim()) return;
          p.onGuardar({ contenidoOverride: texto || null });
        }}
      />
    </div>
  );
}
