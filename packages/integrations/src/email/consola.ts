import type { Correo, Mailer } from "./mailer";

/**
 * Adaptador de desarrollo: escribe el correo en el log del servidor para poder seguir los
 * enlaces de invitación y recuperación sin un proveedor configurado.
 */
export function mailerConsola(log: (linea: string) => void = console.info): Mailer {
  return {
    nombre: "consola",
    async enviar(correo: Correo) {
      log(`[correo] para=${correo.para} asunto="${correo.asunto}"\n${correo.texto}`);
    },
  };
}
