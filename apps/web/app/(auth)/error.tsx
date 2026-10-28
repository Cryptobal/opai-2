"use client";

import { ErrorDiferido } from "@/app/_components/error-diferido";
import type { PropsError } from "@/app/_components/pantalla-error";

// Límite de error de las pantallas sin shell (CAR-50): en español y con «Reintentar», no la de Next.
export default function ErrorSinShell(props: PropsError) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
      <ErrorDiferido {...props} />
    </main>
  );
}
