"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alerta, Button, Campo, InputPassword } from "@opai/ds";

import { accionDesactivarMfa, type ConfirmaMfa } from "@/app/_acciones/mfa";

/** Desactiva el segundo factor desde Mi cuenta; exige la contraseña y refresca el estado al terminar. */
export function DesactivarMfa() {
  const router = useRouter();
  const [estado, desactivar, pendiente] = useActionState<ConfirmaMfa | null, FormData>(
    accionDesactivarMfa,
    null,
  );
  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);
  return (
    <form action={desactivar} className="flex max-w-sm flex-col gap-3">
      {estado && !estado.ok ? (
        <Alerta tono="danger" titulo="No se pudo desactivar">
          {estado.error}
        </Alerta>
      ) : null}
      <Campo
        etiqueta="Contraseña"
        htmlFor="password"
        ayuda="Confirma tu contraseña para desactivar el segundo factor."
      >
        <InputPassword
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          required
          disabled={pendiente}
        />
      </Campo>
      <Button type="submit" variant="destructive" size="md" cargando={pendiente}>
        Desactivar segundo factor
      </Button>
    </form>
  );
}
