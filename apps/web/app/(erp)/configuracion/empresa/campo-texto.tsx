"use client";

import { Campo, Input } from "@opai/ds";

type Props = {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  tipo?: "text" | "email" | "tel" | "url";
  mono?: boolean;
  disabled?: boolean;
  error?: string | undefined;
};

/** Campo de texto con etiqueta (formularios de Configuración). */
export function CampoTexto(p: Props) {
  if (p.disabled) return <DatoLectura etiqueta={p.etiqueta} valor={p.valor} />;
  return (
    <Campo etiqueta={p.etiqueta} htmlFor={p.id} {...(p.error ? { error: p.error } : {})}>
      <Input
        id={p.id}
        type={p.tipo ?? "text"}
        value={p.valor}
        placeholder={p.placeholder}
        disabled={p.disabled}
        className={p.mono ? "t-mono" : undefined}
        aria-invalid={p.error ? true : undefined}
        onChange={(e) => p.onCambiar(e.target.value)}
      />
    </Campo>
  );
}

export function DatoLectura({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-label text-fg-muted">{etiqueta}</span>
      <span className="t-body text-fg">{valor?.trim() || "Sin dato"}</span>
    </div>
  );
}
