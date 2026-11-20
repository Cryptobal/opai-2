"use client";

import { useActionState, useState } from "react";

import { Alerta, Button, Campo, Input, Textarea } from "@opai/ds";

type EstadoInicial = { estado: "inicial" };
type EstadoListo = { estado: "listo"; decision?: string; resultado?: string };
type EstadoError = { estado: "error"; texto: string };
export type EstadoForm = EstadoInicial | EstadoListo | EstadoError;

type Props = {
  slug: string;
  token: string;
  accion: (slug: string, token: string, prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
  textos: {
    exitoAceptar: string;
    exitoRechazar: string;
    detalleAceptar: string;
    detalleRechazar: string;
    aceptar: string;
    rechazarBoton: string;
    enviarObjecion: string;
  };
  campoDecision: string;
  valorAceptar: string;
  valorRechazar: string;
};

const INICIAL: EstadoInicial = { estado: "inicial" };

export function FormularioEnlaceRut({ slug, token, accion, textos, campoDecision, valorAceptar, valorRechazar }: Props) {
  const [estado, enviar, pendiente] = useActionState(accion.bind(null, slug, token), INICIAL);
  const [objetar, setObjetar] = useState(false);

  if (estado.estado === "listo") {
    const valor = estado.decision ?? estado.resultado ?? "";
    return (
      <Alerta tono="success" titulo={valor === valorAceptar ? textos.exitoAceptar : textos.exitoRechazar}>
        {valor === valorAceptar ? textos.detalleAceptar : textos.detalleRechazar}
      </Alerta>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Tu RUT" htmlFor="rut" ayuda="Para confirmar que eres tú.">
        <Input id="rut" name="rut" autoComplete="off" inputMode="text" placeholder="12.345.678-9" required />
      </Campo>
      {objetar ? (
        <Campo etiqueta="Por qué no estás de acuerdo" htmlFor="comentario" {...(estado.estado === "error" ? { error: estado.texto } : {})}>
          <Textarea id="comentario" name="comentario" rows={3} maxLength={500} required />
        </Campo>
      ) : estado.estado === "error" ? (
        <Alerta tono="danger" titulo="No se pudo registrar">
          {estado.texto}
        </Alerta>
      ) : null}
      <div className="flex flex-col gap-2">
        {objetar ? (
          <>
            <Button type="submit" name={campoDecision} value={valorRechazar} size="lg" block variant="destructive" disabled={pendiente}>
              {pendiente ? "Enviando…" : textos.enviarObjecion}
            </Button>
            <Button type="button" size="lg" block variant="ghost" onClick={() => setObjetar(false)}>
              Volver
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" name={campoDecision} value={valorAceptar} size="lg" block disabled={pendiente}>
              {pendiente ? "Enviando…" : textos.aceptar}
            </Button>
            <Button type="button" size="lg" block variant="secondary" onClick={() => setObjetar(true)}>
              {textos.rechazarBoton}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}