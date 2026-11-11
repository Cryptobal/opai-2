import type { ReactNode } from "react";

import { diaLargo } from "@/lib/fechas";
import { nombreDePila } from "@/lib/nombre";

function saludo(ahora: Date) {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Santiago",
    }).format(ahora),
  );
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

type Props = { nombre: string; empresa: string; ahora: Date; hilo: boolean; crear: ReactNode };

/**
 * Encabezado de Inicio: saludo, fecha y «Crear». En el marco Hilo (ADR-090) el saludo ya está en el
 * hilo, a la izquierda, así que aquí quedan solo la fecha y «Crear».
 */
export function EncabezadoInicio({ nombre, empresa, ahora, hilo, crear }: Props) {
  const pila = nombreDePila(nombre);
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {hilo ? null : (
          <h2 className="t-title text-fg">
            <span className="md:hidden">Hola, {pila}</span>
            <span className="hidden md:inline">
              {saludo(ahora)}, {pila}
            </span>
          </h2>
        )}
        <p className="text-base text-fg-muted">
          {diaLargo(ahora)}
          <span className="hidden md:inline"> · {empresa}</span>
        </p>
      </div>
      {crear}
    </div>
  );
}
