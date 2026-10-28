"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SeccionTarjeta, Skeleton } from "@opai/ds";

const Contenido = dynamic(() => import("./bandeja").then((m) => m.Bandeja), { ssr: false });

/** La Bandeja ya consulta tras montar; tampoco carga su interacción en el JS inicial (ADR-037). */
export function Bandeja() {
  const [montada, setMontada] = useState(false);
  useEffect(() => { void Promise.resolve().then(() => setMontada(true)); }, []);
  return montada ? <Contenido /> : (
    <section id="bandeja" className="scroll-mt-20">
      <SeccionTarjeta titulo="Bandeja"><Skeleton className="h-20" /></SeccionTarjeta>
    </section>
  );
}
