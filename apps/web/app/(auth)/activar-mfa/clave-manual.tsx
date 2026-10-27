"use client";

import { BotonCopiar } from "@/app/_components/boton-copiar";

export function ClaveManual({ secret }: { secret: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-fg-muted">
        Si no puedes escanearlo, introduce esta clave en tu app:
      </p>
      <span data-mfa-secret className="t-mono break-all text-fg">
        {secret.match(/.{1,4}/g)?.join(" ")}
      </span>
      <BotonCopiar texto={secret} etiqueta="Copiar clave" />
    </div>
  );
}
