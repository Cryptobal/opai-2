import { personasAccesoEstado } from "./personas-acceso-estado";
import { personasDarAccesoPortal, personasReenviarInvitacionPortal } from "./personas-acceso-escritura";

export const capacidadesPersonasAcceso = [
  personasAccesoEstado,
  personasDarAccesoPortal,
  personasReenviarInvitacionPortal,
] as const;