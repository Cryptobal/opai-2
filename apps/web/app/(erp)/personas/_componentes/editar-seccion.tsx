import { Pencil } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { SECCIONES_LABORAL, type SeccionLaboral } from "./config-hojas-laboral";
import { HojaLaboral } from "./diferidas";

/** Botón «Editar» de la cabecera de una sección de Laboral (solo con permiso de escritura). */
export function BotonEditarSeccion({ seccion, etiqueta = "Editar" }: { seccion: SeccionLaboral; etiqueta?: string }) {
  return (
    <EnlaceBotonHoja
      variante="secondary"
      icono={Pencil}
      href={`?${SECCIONES_LABORAL[seccion].param}=1`}
    >
      {etiqueta}
    </EnlaceBotonHoja>
  );
}

/** Hoja de edición de la sección, con los valores actuales como texto. */
export function HojaEditarSeccion(props: {
  seccion: SeccionLaboral;
  personaId: string;
  inicial: Record<string, string | null | undefined>;
  bloqueo?: string;
}) {
  const inicial = Object.fromEntries(
    Object.entries(props.inicial).map(([k, v]) => [k, v ?? ""]),
  );
  return (
    <HojaLaboral
      seccion={props.seccion}
      personaId={props.personaId}
      inicial={inicial}
      {...(props.bloqueo ? { bloqueo: props.bloqueo } : {})}
    />
  );
}
