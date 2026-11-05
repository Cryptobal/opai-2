"use client";

import { useActionState, useState } from "react";

import { Alerta, AuthCard, Button, Campo, Input, TecladoPin } from "@opai/ds";
import { formatearRut } from "@opai/domain";

import { accionEntrarConPin, type EstadoPin } from "@/app/_acciones/ingreso-pin";
import { LinkNext } from "@/app/_components/link-next";

/** Login Trabajador según el diseño aprobado (export-acceso 06 y 07): RUT con formato y PIN con teclado. */
export function FormularioPin({ inicial }: { inicial?: EstadoPin }) {
  const [estado, entrar, pendiente] = useActionState(
    accionEntrarConPin,
    inicial ?? ({ tipo: "inicial" } as EstadoPin),
  );
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const listo = pin.length === 6 && rut.replace(/[^0-9kK]/g, "").length >= 7;
  return (
    <AuthCard
      sufijo="Trabajador"
      titulo="Ingresa con tu RUT"
      subtitulo="Tu PIN de 6 dígitos"
      pie={
        <LinkNext href="/login" className="font-medium text-accent">
          Entrar con correo y contraseña
        </LinkNext>
      }
      Link={LinkNext}
    >
      {estado.tipo === "error" ? (
        <Alerta key={estado.n} tono="danger" titulo="RUT o PIN incorrectos">
          Revisa los datos y vuelve a intentarlo. Tras varios intentos pausaremos el acceso unos
          minutos.
        </Alerta>
      ) : null}
      {estado.tipo === "pausado" ? (
        <Alerta key={estado.n} tono="warning" titulo="Pausamos el acceso">
          Hubo demasiados intentos. Vuelve a intentarlo en unos minutos o pide ayuda a RR. HH.
        </Alerta>
      ) : null}
      <form
        action={(form) => {
          entrar(form);
          setPin("");
        }}
        className="flex flex-col gap-5"
      >
        <Campo etiqueta="RUT" htmlFor="rut">
          <Input
            id="rut"
            name="rut"
            inputMode="text"
            autoComplete="username"
            placeholder="12.345.678-5"
            className="t-mono text-center text-lg"
            value={rut}
            onChange={(e) => setRut(formatearRut(e.target.value))}
            disabled={pendiente}
            required
          />
        </Campo>
        <TecladoPin
          name="pin"
          valor={pin}
          onCambiar={setPin}
          disabled={pendiente}
          error={estado.tipo === "error"}
          etiqueta="PIN de 6 dígitos"
        />
        <Button type="submit" size="lg" block disabled={pendiente || !listo}>
          {pendiente ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthCard>
  );
}
