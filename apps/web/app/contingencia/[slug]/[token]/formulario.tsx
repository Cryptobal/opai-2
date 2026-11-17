import { FormularioEnlaceRut } from "@/app/_components/enlace-respuesta/formulario-rut";

import { accionResponder } from "./accion";

export function FormularioRespuesta({ slug, token }: { slug: string; token: string }) {
  return (
    <FormularioEnlaceRut
      slug={slug}
      token={token}
      accion={accionResponder}
      campoDecision="decision"
      valorAceptar="aceptada"
      valorRechazar="rechazada"
      textos={{
        exitoAceptar: "Aceptaste la contingencia",
        exitoRechazar: "Objetaste la contingencia",
        detalleAceptar: "La marca quedará registrada. Puedes cerrar esta página.",
        detalleRechazar: "Tu objeción quedó registrada. Puedes cerrar esta página.",
        aceptar: "Acepto la marca",
        rechazarBoton: "No estoy de acuerdo",
        enviarObjecion: "Enviar objeción",
      }}
    />
  );
}