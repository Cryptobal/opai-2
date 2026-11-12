"use client";

import { AuthCard, Button } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";
import { trasLimpiarCaches } from "@/app/_components/pwa/limpiar-cache";

import { EntrarConPasskey } from "../login/entrar-passkey";

/** Segundo paso de una cuenta protegida solo con passkeys (CAR-286): Face ID, huella o llave. */
export function VerificarConPasskey({ destino }: { destino: string }) {
  return (
    <AuthCard
      titulo="Verifica tu identidad"
      subtitulo="Usa tu passkey: Face ID, huella o tu llave de seguridad"
      Link={LinkNext}
      pie={
        <Button variant="ghost" onClick={() => trasLimpiarCaches(accionSalir)}>
          Volver a iniciar sesión
        </Button>
      }
    >
      <EntrarConPasskey destino={destino} autocompletar={false} texto="Usar mi passkey" principal />
    </AuthCard>
  );
}
