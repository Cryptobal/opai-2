import { FormularioEnlaceRut } from "@/app/_components/enlace-respuesta/formulario-rut";

import { accionResponder } from "./accion";

/** Responder la corrección: RUT para identificarse y, si se objeta, un comentario obligatorio. */
export function FormularioRespuesta({ slug, token }: { slug: string; token: string }) {
  return (
    <FormularioEnlaceRut
      slug={slug}
      token={token}
      accion={accionResponder}
      campoDecision="resultado"
      valorAceptar="aceptada"
      valorRechazar="objetada"
      textos={{
        exitoAceptar: "Aceptaste la corrección",
        exitoRechazar: "Objetaste la corrección",
        detalleAceptar: "Quedó registrada. Puedes cerrar esta página.",
        detalleRechazar: "Tu objeción quedó registrada y la empresa la revisará. Puedes cerrar esta página.",
        aceptar: "Acepto la corrección",
        rechazarBoton: "No estoy de acuerdo",
        enviarObjecion: "Enviar objeción",
      }}
    />
  );
}