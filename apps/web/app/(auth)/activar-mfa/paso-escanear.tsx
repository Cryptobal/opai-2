"use client";

import { useEffect, useRef, useState } from "react";

import { Alerta, Button, Campo, Checkbox, CodigoQr, CodigosRespaldo, Input } from "@opai/ds";

import { ClaveManual } from "./clave-manual";

type Props = {
  svg: string;
  secret: string;
  codigos: string[];
  confirmar: (form: FormData) => void;
  confirmando: boolean;
  error: string | undefined;
};

export function PasoEscanear({ svg, secret, codigos, confirmar, confirmando, error }: Props) {
  const foco = useRef<HTMLHeadingElement>(null);
  const [guardados, setGuardados] = useState(false);
  useEffect(() => {
    foco.current?.focus();
  }, []);
  return (
    <>
      <h2 ref={foco} tabIndex={-1} className="t-label text-fg">
        Configura tu autenticador
      </h2>
      <CodigoQr svg={svg} />
      <ClaveManual secret={secret} />
      <Alerta tono="warning" titulo="Guarda tus códigos de respaldo">
        Guárdalos ahora. No los verás de nuevo. Cada código sirve una sola vez si pierdes tu
        autenticador.
      </Alerta>
      <CodigosRespaldo codigos={codigos} />
      <form action={confirmar} className="flex flex-col gap-4">
        <Checkbox marcado={guardados} onCambiar={setGuardados} etiqueta="Ya guardé mis códigos" />
        <Input type="hidden" name="codigosGuardados" value={guardados ? "si" : "no"} />
        {error ? (
          <div id="mfa-error-confirmar">
            <Alerta tono="danger" titulo="No pudimos activar">
              {error}
            </Alerta>
          </div>
        ) : null}
        <Campo etiqueta="Código del autenticador" htmlFor="codigo">
          <Input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            disabled={confirmando}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "mfa-error-confirmar" : undefined}
            onChange={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
            onPaste={(e) => {
              const v = e.clipboardData.getData("text").replace(/\D/g, "");
              e.preventDefault();
              e.currentTarget.value = v.slice(0, 6);
            }}
          />
        </Campo>
        <Button type="submit" size="lg" block cargando={confirmando} disabled={!guardados}>
          Activar segundo factor
        </Button>
      </form>
    </>
  );
}
