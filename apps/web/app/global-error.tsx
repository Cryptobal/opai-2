"use client";

import "./globals.css";

import { ErrorDiferido } from "@/app/_components/error-diferido";
import type { PropsError } from "@/app/_components/pantalla-error";

/**
 * Último recurso (CAR-50): un fallo en el layout raíz reemplaza todo el documento. En español y con
 * los tokens del DS (el tema sigue al sistema: el script de tema del layout raíz no corre aquí).
 */
export default function ErrorGlobal(props: PropsError) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>Algo salió mal · OPAI</title>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-4">
          <ErrorDiferido {...props} />
        </main>
      </body>
    </html>
  );
}
