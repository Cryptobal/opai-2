"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Skeleton } from "@opai/ds";

import type { CuentaFila } from "@/lib/tipos-maestros";

const FormularioEmitir = dynamic(
  () => import("./formulario-emitir").then((m) => m.FormularioEmitir),
  { ssr: false },
);

/** Formulario de emisión DTE: se monta aparte para no superar el presupuesto JS de la ruta (ADR-037). */
export function FormularioEmitirDiferido({
  cuentas,
  sinRut,
}: {
  cuentas: CuentaFila[];
  sinRut: number;
}) {
  const [montada, setMontada] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => setMontada(true));
  }, []);
  if (!montada) return <Skeleton className="min-h-96 w-full" />;
  return <FormularioEmitir cuentas={cuentas} sinRut={sinRut} />;
}
