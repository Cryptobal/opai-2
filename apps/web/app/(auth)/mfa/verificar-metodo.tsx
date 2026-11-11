"use client";

import { useActionState } from "react";

import { Alerta, AuthCard, Button, Campo, Input } from "@opai/ds";

import { accionVerificar, type EstadoVerificar } from "@/app/_acciones/mfa";
import { accionSalir } from "@/app/_acciones/auth";
import { LinkNext } from "@/app/_components/link-next";
import { trasLimpiarCaches } from "@/app/_components/pwa/limpiar-cache";

import { EntrarConPasskey } from "../login/entrar-passkey";

export type Metodo = "totp" | "respaldo";

export function VerificarMetodo({
  destino,
  metodo,
  onCambiar,
}: {
  destino: string;
  metodo: Metodo;
  onCambiar: () => void;
}) {
  const [estado, verificar, pendiente] = useActionState<EstadoVerificar, FormData>(
    accionVerificar.bind(null, destino, metodo),
    { tipo: "inicial" },
  );
  const error = estado.tipo !== "inicial";
  return (
    <AuthCard
      titulo="Verifica tu identidad"
      subtitulo={
        metodo === "totp"
          ? "Introduce el código de tu app de autenticación"
          : "Usa uno de tus códigos de respaldo"
      }
      Link={LinkNext}
      pie={
        <Button variant="ghost" onClick={() => trasLimpiarCaches(accionSalir)}>
          Volver a iniciar sesión
        </Button>
      }
    >
      {error ? (
        <div id="mfa-error" key={estado.n}>
          <Alerta
            tono={estado.tipo === "error" ? "danger" : "warning"}
            titulo={
              estado.tipo === "pausado"
                ? estado.titulo
                : estado.tipo === "expirado"
                  ? "El acceso expiró"
                  : "Revisa el código"
            }
          >
            {estado.tipo === "expirado" ? "Vuelve a iniciar sesión para continuar." : estado.texto}
          </Alerta>
        </div>
      ) : null}
      <form action={verificar} className="flex flex-col gap-4">
        <Campo
          etiqueta={metodo === "totp" ? "Código del autenticador" : "Código de respaldo"}
          htmlFor="codigo"
        >
          <Input
            id="codigo"
            name="codigo"
            required
            autoFocus
            autoComplete="one-time-code"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode={metodo === "totp" ? "numeric" : "text"}
            disabled={pendiente}
            maxLength={metodo === "totp" ? 6 : 32}
            pattern={metodo === "totp" ? "[0-9]{6}" : undefined}
            aria-invalid={error}
            aria-describedby={error ? "mfa-error" : undefined}
            onPaste={
              metodo === "totp"
                ? (e) => {
                    e.preventDefault();
                    e.currentTarget.value = e.clipboardData
                      .getData("text")
                      .replace(/\D/g, "")
                      .slice(0, 6);
                  }
                : undefined
            }
          />
        </Campo>
        <Button type="submit" size="lg" block cargando={pendiente}>
          Verificar
        </Button>
        <Button type="button" variant="ghost" disabled={pendiente} onClick={onCambiar}>
          {metodo === "totp" ? "Usar un código de respaldo" : "Usar mi autenticador"}
        </Button>
      </form>
      <EntrarConPasskey destino={destino} autocompletar={false} texto="Usar una passkey" />
    </AuthCard>
  );
}
