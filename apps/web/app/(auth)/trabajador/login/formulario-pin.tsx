"use client";

import { useActionState, useState } from "react";

import { Alerta, AuthCard, Button, Campo, Input, TecladoPin } from "@opai/ds";
import { formatearRut } from "@opai/domain";

import { accionEntrarConPin, type EstadoPin } from "@/app/_acciones/ingreso-pin";
import { LinkNext } from "@/app/_components/link-next";

/** Login Trabajador según el diseño aprobado (export-acceso 06 y 07): RUT con formato y PIN con teclado. */
export function FormularioPin({
  inicial,
  destino = "",
}: {
  inicial?: EstadoPin;
  destino?: string;
}) {
  const [estado, entrar, pendiente] = useActionState(
    accionEntrarConPin.bind(null, destino),
    inicial ?? ({ tipo: "inicial" } as EstadoPin),
  );
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  // Tras un PIN incorrecto o una pausa se limpia el teclado; en el paso «elegir tu PIN» el PIN temporal
  // debe quedarse: viaja otra vez con el PIN nuevo.
  const [vistoN, setVistoN] = useState(0);
  const nActual = "n" in estado ? estado.n : 0;
  if (nActual !== vistoN) {
    setVistoN(nActual);
    if (estado.tipo === "error" || estado.tipo === "pausado") setPin("");
  }
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
      {estado.tipo === "cambiar" ? (
        <Alerta
          key={estado.n}
          tono={estado.mensaje ? "danger" : "info"}
          titulo="Elige tu propio PIN"
        >
          {estado.mensaje ??
            "RR. HH. te dio un PIN temporal. Elige uno nuevo que solo tú conozcas."}
        </Alerta>
      ) : null}
      <form action={entrar} className="flex flex-col gap-5">
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
        {estado.tipo === "cambiar" ? (
          <>
            <Input type="hidden" name="pin" value={pin} readOnly />
            {(["nuevo", "repetir"] as const).map((campo) => (
              <Campo
                key={campo}
                etiqueta={campo === "nuevo" ? "PIN nuevo (6 dígitos)" : "Repite el PIN nuevo"}
                htmlFor={`pin-${campo}`}
              >
                <Input
                  id={`pin-${campo}`}
                  name={campo}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  disabled={pendiente}
                  required
                />
              </Campo>
            ))}
          </>
        ) : (
          <TecladoPin
            name="pin"
            valor={pin}
            onCambiar={setPin}
            disabled={pendiente}
            error={estado.tipo === "error"}
            etiqueta="PIN de 6 dígitos"
          />
        )}
        <Button type="submit" size="lg" block disabled={pendiente || !listo}>
          {pendiente ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthCard>
  );
}
