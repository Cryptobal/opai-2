"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "../cn";
import { Button } from "./button";

type Props = {
  id?: string;
  /** Últimos 4 caracteres del secreto guardado; sin valor, no hay secreto. */
  guardado?: string | null;
  /** Devolver `false` indica que no se guardó: el campo sigue en edición con lo escrito para corregirlo. */
  onGuardar: (valor: string) => void | boolean | Promise<void | boolean>;
  /** Mensaje de error bajo el campo (reemplaza la nota de cifrado mientras se muestra). */
  error?: string | null;
  placeholder?: string;
  pendiente?: boolean;
  "aria-label"?: string;
};

/**
 * Credencial de una integración: input de contraseña con "mostrar"; tras guardar queda enmascarado
 * (`••••••••1234`) y solo admite "Reemplazar". Nunca vuelve a mostrar el valor.
 */
export function CampoSecreto({ id, guardado, onGuardar, placeholder, pendiente, error, ...a }: Props) {
  const auto = useId();
  const [editando, setEditando] = useState(!guardado);
  const [valor, setValor] = useState("");
  const [visible, setVisible] = useState(false);
  if (guardado && !editando) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <span
            id={id}
            aria-label={a["aria-label"]}
            className="t-mono flex h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-fill px-3 text-fg-muted"
          >
            ••••••••{guardado}
          </span>
          <Button variant="secondary" className="h-11" onClick={() => setEditando(true)}>
            Reemplazar
          </Button>
        </div>
        <p className="t-caption">Se guarda cifrado y no se vuelve a mostrar</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <span className="relative min-w-0 flex-1">
          <input
            id={id ?? auto}
            type={visible ? "text" : "password"}
            value={valor}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setValor(e.target.value)}
            placeholder={placeholder ?? "Pega la clave"}
            aria-label={a["aria-label"]}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id ?? auto}-error` : undefined}
            className={cn(
              "t-mono h-11 w-full rounded-md border border-border-control bg-surface pr-11 pl-3 text-fg outline-none",
              "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ds-accent-muted)]",
              "aria-invalid:border-danger-fg aria-invalid:shadow-[0_0_0_3px_var(--ds-danger-muted)]",
            )}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar" : "Mostrar"}
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-fg-muted"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
        <Button
          className="h-11"
          disabled={!valor.trim() || pendiente}
          onClick={async () => {
            if ((await onGuardar(valor.trim())) === false) return;
            setValor("");
            setVisible(false);
            setEditando(false);
          }}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {error ? (
        <p id={`${id ?? auto}-error`} role="alert" className="t-caption text-danger-fg">
          {error}
        </p>
      ) : (
        <p className="t-caption">Se guarda cifrado y no se vuelve a mostrar</p>
      )}
    </div>
  );
}
