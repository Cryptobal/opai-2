import type { EventEmitter } from "node:events";

/** Mantiene protegido el socket de control mientras el caso usa su cliente Prisma. */
export function vigilarCatalogo(cliente: Pick<EventEmitter, "on" | "once" | "removeListener">) {
  let fallo = false;
  const registrar = () => { fallo = true; };
  const retirar = () => {
    cliente.removeListener("error", registrar);
    cliente.removeListener("end", retirar);
  };
  cliente.on("error", registrar);
  cliente.once("end", retirar);
  return { fallo: () => fallo, retirar };
}
