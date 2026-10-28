"use client";

import { ErrorDiferido } from "@/app/_components/error-diferido";
import type { PropsError } from "@/app/_components/pantalla-error";

// Límite de error del portal (CAR-50): el fallo de una carga se ve dentro del shell, no la página de Next.
export default function ErrorPortal(props: PropsError) {
  return <ErrorDiferido {...props} />;
}
