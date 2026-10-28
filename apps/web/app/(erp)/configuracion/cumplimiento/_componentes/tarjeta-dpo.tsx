import { Pencil } from "lucide-react";

import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { telefono } from "@/lib/fechas";

import type { EstadoDpa } from "./datos";

/** Delegado de protección de datos (DPO) de la empresa: va en el pie legal y en los avisos. */
export function TarjetaDpo({ dpo, editar }: { dpo: EstadoDpa["dpo"]; editar: boolean }) {
  const accion = editar ? (
    <EnlaceBotonHoja href="?dpo=1" icono={Pencil} variante="secondary">
      {dpo.nombre ? "Editar" : "Designar"}
    </EnlaceBotonHoja>
  ) : null;
  return (
    <SeccionTarjeta titulo="Delegado de protección de datos (DPO)" {...(accion ? { accion } : {})}>
      {dpo.nombre || dpo.correo ? (
        <ParesGrid
          items={[
            { etiqueta: "Nombre", valor: dpo.nombre },
            { etiqueta: "Correo", valor: dpo.correo },
            { etiqueta: "Teléfono", valor: dpo.telefono ? telefono(dpo.telefono) : null },
          ]}
        />
      ) : (
        <p className="text-base text-fg-muted">
          Aún no hay un DPO designado. La Ley 21.719 pide un contacto para los titulares y la
          Agencia.
        </p>
      )}
    </SeccionTarjeta>
  );
}
