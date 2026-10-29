"use client";

import { useActionState, useState } from "react";

import { Alerta, Button, Campo, CodigosRespaldo, Dialog, InputPassword } from "@opai/ds";

import { accionRegenerarCodigos, type RegenerarCodigos } from "@/app/_acciones/mfa";

/** Regenera los códigos de respaldo (CAR-54, I-15): invalida los anteriores; exige la contraseña. */
export function RegenerarCodigosDeRespaldo() {
  const [abierto, setAbierto] = useState(false);
  const [estado, regenerar, pendiente] = useActionState<RegenerarCodigos, FormData>(
    accionRegenerarCodigos,
    null,
  );

  return (
    <>
      <Button variant="secondary" size="md" onClick={() => setAbierto(true)}>
        Regenerar códigos de respaldo
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Regenerar códigos de respaldo"
        descripcion={
          estado?.ok
            ? "Guarda estos códigos ahora: los anteriores dejaron de servir."
            : "Confirma tu contraseña. Los códigos anteriores dejarán de servir."
        }
      >
        {estado?.ok ? (
          <div className="flex flex-col gap-4">
            <CodigosRespaldo codigos={estado.codigos} />
            <Button size="md" block onClick={() => setAbierto(false)}>
              Listo
            </Button>
          </div>
        ) : (
          <form action={regenerar} className="flex flex-col gap-4">
            {estado && !estado.ok ? (
              <Alerta tono="danger" titulo="No se pudo regenerar">
                {estado.error}
              </Alerta>
            ) : null}
            <Campo etiqueta="Contraseña" htmlFor="password-regenerar">
              <InputPassword
                id="password-regenerar"
                name="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                required
                disabled={pendiente}
              />
            </Campo>
            <Button type="submit" size="md" block cargando={pendiente}>
              Regenerar
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
