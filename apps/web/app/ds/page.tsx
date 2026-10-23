import { notFound } from "next/navigation";

import { Shell } from "@/app/_components/shell";

import { DsShowcase } from "./showcase";

export const metadata = { title: "Diseño" };

/** Muestra del DS 2.0: shell, cinco patrones y cuatro estados. Solo fuera de producción. */
export default function PaginaDs() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Shell portal="erp" titulo="Diseño (DS 2.0 provisional)">
      <DsShowcase />
    </Shell>
  );
}
