import type { Entorno } from "./entorno";

/** En `test:db` paralelo otras suites dejan UF/UTM verificados sin `consultada_el` y `juegoDeValores` falla. */
export async function repararConsultadaElIndicadores(
  e: Entorno,
  consultadaEl = new Date("2026-11-01"),
) {
  await e.admin.valorPublicado.updateMany({
    where: { consultadaEl: null, verificacion: "verificado" },
    data: { consultadaEl },
  });
}