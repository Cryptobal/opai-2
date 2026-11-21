"use client";

import { useActionState } from "react";

import { Alerta, Button, Campo, Input } from "@opai/ds";

type Estado = { ok: boolean; error?: string };

export function FormIngreso({ action }: { action: (f: FormData) => Promise<Estado> }) {
  const [estado, formAction, pendiente] = useActionState(async (_: Estado, form: FormData) => action(form), { ok: true });
  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div>
        <h1 className="t-title m-0">Portal de fiscalización</h1>
        <p className="t-body-sm muted m-0 mt-1">Solo lectura para funcionarios de la Dirección del Trabajo.</p>
      </div>
      <Campo etiqueta="Correo institucional" htmlFor="correo" ayuda="Solo correos @dt.gob.cl o clave temporal.">
        <Input id="correo" name="correo" type="email" required />
      </Campo>
      <Campo etiqueta="RUT del empleador" htmlFor="rut">
        <Input id="rut" name="rut" className="font-mono" required />
      </Campo>
      <Campo etiqueta="Clave temporal (opcional)" htmlFor="clave">
        <Input id="clave" name="clave" className="font-mono" />
      </Campo>
      {estado.error ? <Alerta tono="danger" titulo="No pudimos ingresar">{estado.error}</Alerta> : null}
      <Button type="submit" size="lg" disabled={pendiente}>{pendiente ? "Ingresando…" : "Ingresar"}</Button>
      <Alerta tono="info" titulo="Tu acceso queda registrado">Guardamos fecha, correo, RUT e IP de origen.</Alerta>
    </form>
  );
}