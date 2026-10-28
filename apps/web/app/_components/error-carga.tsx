import { RotateCw } from "lucide-react";
import { headers } from "next/headers";

import { ErrorState, Forbidden } from "@opai/ds";

import { EnlaceBoton } from "./maestros/enlace-boton";

/**
 * Componente único de fallo de carga (CAR-50): `PaginaPortal` lo muestra dentro del shell cuando su
 * `cargar` lanza. Es de servidor, así que no suma JavaScript a ninguna ruta (ADR-037). «Reintentar»
 * vuelve a pedir la misma URL con `reintento` nuevo (la marca del request): la caché del router (staleTimes) no puede
 * devolver el error guardado.
 */
export async function ErrorCarga({ fallo, ruta }: { fallo: "forbidden" | "error"; ruta: string }) {
  if (fallo === "forbidden") return <Forbidden />;
  const h = await headers();
  const actual = h.get("x-opai-ruta") ?? ruta;
  // Marca del request (la fija el proxy): distinta en cada intento, así la URL nunca está en caché.
  const href = `${actual}${actual.includes("?") ? "&" : "?"}reintento=${h.get("x-opai-t0") ?? "1"}`;
  return (
    <ErrorState
      titulo="No pudimos cargar esta página"
      descripcion="Puede ser un problema momentáneo de conexión o del servicio. Inténtalo de nuevo en unos segundos."
      accion={
        <EnlaceBoton href={href} variante="secondary" icono={RotateCw}>
          Reintentar
        </EnlaceBoton>
      }
    />
  );
}
