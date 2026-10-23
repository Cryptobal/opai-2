import { notFound } from "next/navigation";

import { Bloque } from "../bloques";
import { MuestraFormulario, MuestraQaPasada1 } from "./muestra";

export const metadata = { title: "Diseño · QA pasada 1" };

/** Casos de la QA pasada 1 (dirección larga, fecha es-CL, chips). Solo fuera de producción; aparte de /ds por su presupuesto de JS. */
export default function PaginaQa() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-5xl p-4">
      <Bloque titulo="QA pasada 1 · dirección larga, fecha es-CL y chips activos">
        <MuestraQaPasada1 />
      </Bloque>
      <Bloque titulo="QA pasada 2 · formulario con dirección larga sin desborde horizontal">
        <MuestraFormulario />
      </Bloque>
    </main>
  );
}
