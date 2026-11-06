import { TRABAJADOR } from "./asistencia";
import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

// Aviso al trabajador de una marca de contingencia propuesta a su nombre (A3: la acepta él, no RR. HH.).
export const COMUNICABLES_CONTINGENCIA: readonly EventoComunicable[] = [
  {
    evento: "asistencia.contingencia.propuesta",
    nombre: "Marca de contingencia por responder",
    descripcion:
      "Avisa al trabajador, en su correo personal, que RR. HH. o su supervisor propusieron una marca a su nombre porque el sistema no estuvo disponible. No cuenta hasta que la acepte u objete desde su portal.",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("contingencia.tipo", "texto", "Entrada", "Tipo de la marca propuesta."),
      v("contingencia.hora", "texto", "5 de noviembre de 2026, 08:00", "Hora que se declara."),
      v("contingencia.motivo", "texto", "Caída del sistema durante el turno", "Motivo de quien la propone."),
      EMPRESA,
      URL("Tu portal, donde la aceptas u objetas."),
    ],
    plantillas: {
      correo: {
        asunto: "Marca de contingencia por responder: {{contingencia.tipo}}",
        cuerpo:
          "{{trabajador.nombre}}, se propone registrar a tu nombre una marca de contingencia:\n\nTipo: {{contingencia.tipo}}\nHora declarada: {{contingencia.hora}}\nMotivo: {{contingencia.motivo}}\n\nNo cuenta hasta que la aceptes. Si no estás de acuerdo, puedes objetarla con un comentario.\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];
