"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alerta, Button, Campo, CodigosRespaldo, InputPassword } from "@opai/ds";
import { accionRegenerarCodigos, type EstadoCodigos } from "@/app/_acciones/mfa";

export function RegenerarCodigos() {
  const [estado, accion, pendiente] = useActionState<EstadoCodigos | null, FormData>(
    accionRegenerarCodigos,
    null,
  );
  // Cerrado muestra solo el botón: así no se confunde con «Contraseña» de más arriba.
  const [abierto, setAbierto] = useState(false);
  const foco = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (estado?.ok) foco.current?.focus();
  }, [estado]);
  if (estado?.ok)
    return (
      <div className="flex flex-col gap-3">
        <h3 ref={foco} tabIndex={-1} className="t-label text-fg">
          Nuevos códigos de respaldo
        </h3>
        <Alerta tono="warning" titulo="Guarda tus códigos de respaldo">
          Guárdalos ahora. No los verás de nuevo. Los códigos anteriores dejaron de funcionar.
        </Alerta>
        <CodigosRespaldo codigos={estado.codigos} />
      </div>
    );
  if (!abierto)
    return (
      <div>
        <Button variant="secondary" onClick={() => setAbierto(true)}>
          Regenerar códigos de respaldo
        </Button>
      </div>
    );
  return (
    <form action={accion} className="flex max-w-sm flex-col gap-3">
      {estado && !estado.ok ? (
        <Alerta tono="danger" titulo="No se pudieron regenerar">
          {estado.error}
        </Alerta>
      ) : null}
      <Campo
        etiqueta="Tu contraseña"
        htmlFor="password-regenerar"
        ayuda="Confirma tu contraseña para reemplazar tus códigos de respaldo."
      >
        <InputPassword
          id="password-regenerar"
          name="password"
          autoComplete="current-password"
          required
          disabled={pendiente}
        />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" cargando={pendiente}>
          Regenerar
        </Button>
        <Button variant="ghost" onClick={() => setAbierto(false)} disabled={pendiente}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
