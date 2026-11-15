import { notFound } from "next/navigation";

import { MuestraMarco } from "./muestra-marco";

export const metadata = { title: "Diseño · marco nuevo" };

/** Marco del diseño nuevo (ADR-109, CAR-335 D2) sin sesión, con datos ficticios. Solo fuera de producción. */
export default function PaginaDsMarcoNuevo() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MuestraMarco />;
}
