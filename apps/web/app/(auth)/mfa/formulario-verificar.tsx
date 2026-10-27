"use client";

import { useActionState, useState } from "react";

import { Alerta, AuthCard, Button, Campo, Input } from "@opai/ds";

import { accionVerificar, type EstadoVerificar } from "@/app/_acciones/mfa";
import { LinkNext } from "@/app/_components/link-next";

type Metodo = "totp" | "respaldo";

/**
 * Verificación del segundo factor en el login (NÚCLEO-F). Sin cliente de auth en el navegador: el
 * formulario llama a la Server Action (ADR-037). Alterna entre el código del autenticador (TOTP) y un
 * código de respaldo. Diseño mínimo con `AuthCard` del DS V2 (pendiente de diseño en PR-BODY).
 */
export function FormularioVerificar({ destino }: { destino: string }) {
  const [metodo, setMetodo] = useState<Metodo>("totp");
  const [estado, verificar, pendiente] = useActionState(
    accionVerificar.bind(null, destino, metodo),
    { tipo: "inicial" } as EstadoVerificar,
  );
  const esTotp = metodo === "totp";
  return (
    <AuthCard
      titulo="Verifica tu identidad"
      subtitulo={esTotp ? "Ingresa el código de tu app de autenticación" : "Ingresa un código de respaldo"}
      Link={LinkNext}
    >
      {estado.tipo === "error" ? (
        <Alerta key={estado.n} tono="danger" titulo="No pudimos verificar el código">
          {estado.texto}
        </Alerta>
      ) : null}
      {estado.tipo === "pausado" ? (
        <Alerta key={estado.n} tono="warning" titulo={estado.titulo}>
          {estado.texto}
        </Alerta>
      ) : null}
      {estado.tipo === "expirado" ? (
        <Alerta key={estado.n} tono="warning" titulo="El acceso expiró">
          Vuelve a <LinkNext href="/login" className="text-accent underline">iniciar sesión</LinkNext>.
        </Alerta>
      ) : null}
      <form action={verificar} className="flex flex-col gap-4">
        <Campo etiqueta={esTotp ? "Código de 6 dígitos" : "Código de respaldo"} htmlFor="codigo">
          <Input
            id="codigo"
            name="codigo"
            inputMode={esTotp ? "numeric" : "text"}
            autoComplete="one-time-code"
            placeholder={esTotp ? "123456" : "XXXX-XXXX"}
            autoFocus
            required
            disabled={pendiente}
            {...(estado.tipo === "error" ? { "aria-invalid": true } : {})}
          />
        </Campo>
        <Button type="submit" size="lg" block disabled={pendiente}>
          {pendiente ? "Verificando…" : "Verificar"}
        </Button>
      </form>
      <Button
        variant="ghost"
        size="md"
        block
        type="button"
        onClick={() => setMetodo(esTotp ? "respaldo" : "totp")}
      >
        {esTotp ? "Usar un código de respaldo" : "Usar el código del autenticador"}
      </Button>
    </AuthCard>
  );
}
