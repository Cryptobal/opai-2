"use client";

import { useActionState, useState } from "react";

import { Alerta, Button, Campo, Input, Textarea } from "@opai/ds";

import { accionResponder, type EstadoRespuesta } from "./accion";

const INICIAL: EstadoRespuesta = { estado: "inicial" };

/** Responder la corrección: RUT para identificarse y, si se objeta, un comentario obligatorio. */
export function FormularioRespuesta({ slug, token }: { slug: string; token: string }) {
  const [estado, enviar, pendiente] = useActionState(accionResponder.bind(null, slug, token), INICIAL);
  const [objetar, setObjetar] = useState(false);

  if (estado.estado === "listo")
    return (
      <Alerta tono="success" titulo={estado.resultado === "aceptada" ? "Aceptaste la corrección" : "Objetaste la corrección"}>
        {estado.resultado === "aceptada"
          ? "Quedó registrada. Puedes cerrar esta página."
          : "Tu objeción quedó registrada y la empresa la revisará. Puedes cerrar esta página."}
      </Alerta>
    );

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
        <Alerta tono="danger" titulo="No se pudo registrar">{estado.texto}</Alerta>
      ) : null}
      <div className="flex flex-col gap-2">
        {objetar ? (
          <>
            <Button type="submit" name="resultado" value="objetada" size="lg" block variant="destructive" disabled={pendiente}>
              {pendiente ? "Enviando…" : "Enviar objeción"}
            </Button>
            <Button type="button" size="lg" block variant="ghost" onClick={() => setObjetar(false)}>Volver</Button>
          </>
        ) : (
          <>
            <Button type="submit" name="resultado" value="aceptada" size="lg" block disabled={pendiente}>
              {pendiente ? "Enviando…" : "Acepto la corrección"}
            </Button>
            <Button type="button" size="lg" block variant="secondary" onClick={() => setObjetar(true)}>No estoy de acuerdo</Button>
          </>
        )}
      </div>
    </form>
  );
}
