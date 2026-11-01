import type { ROLES } from "@opai/domain";
import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

export function identidadCpq(rol: (typeof ROLES)[number] = "owner"): Identidad {
  return {
    usuario: { id: "u", nombre: "Prueba", email: "prueba@example.test", platformRole: null },
    actual: membresia({ rol }),
    membresias: [],
    modulosActivos: ["comercial", "cpq"],
    mfaActiva: false,
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
}
