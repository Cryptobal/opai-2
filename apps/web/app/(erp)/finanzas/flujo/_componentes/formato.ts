import { formatearClp, formatearFecha } from "@opai/domain";

/** Pesos chilenos. Vive aparte de la planilla para que Bancos no arrastre sus secciones. */
export const clp = (n: number) => formatearClp(n);

/** ISO `aaaa-mm-dd` → `dd-mm-aaaa` para UI es-CL (el formato común de `@opai/domain`). */
export const fechaDdMmAaaa = (iso: string) => formatearFecha(iso);
