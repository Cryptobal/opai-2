type Etapa = "validar destino" | "abrir catálogo" | "clonar plantilla" | "verificar plantilla vacía" | "socket del catálogo";

export async function prepararComprasQa<T>(
  preparar: (etapa: (valor: Etapa) => void) => Promise<T>,
  limpiar: () => Promise<void>,
) {
  let etapa: Etapa = "validar destino";
  try {
    return await preparar((valor) => { etapa = valor; });
  } catch {
    // El error original de pg/Prisma/URL puede contener la URL o datos del servidor.
    const primaria = new Error(`Preparar fixture de compras: ${etapa}.`);
    try {
      await limpiar();
    } catch (error) {
      const limpieza = error instanceof LimpiezaComprasQaError
        ? error : new LimpiezaComprasQaError(["limpieza no identificada"]);
      throw new AggregateError([primaria, limpieza], `${primaria.message} ${limpieza.message}`);
    }
    throw primaria;
  }
}

type Limpieza = "cerrar Prisma" | "descartar la base de este caso" | "cerrar el catálogo" | "socket del catálogo" | "limpieza no identificada";

export class LimpiezaComprasQaError extends Error {
  constructor(fallos: Limpieza[]) {
    super(`Limpieza fixture de compras: ${fallos.join(", ")}.`);
  }
}

export type { Limpieza };
