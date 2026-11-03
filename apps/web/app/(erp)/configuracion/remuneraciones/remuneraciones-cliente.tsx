"use client";

import { useRouter } from "next/navigation";

import type { Resultado } from "@opai/capabilities";

import { TablaRemuneraciones, type DatosRemuneraciones } from "./tabla-remuneraciones";

export function RemuneracionesCliente({
  r,
  puede,
  abrirMutual = false,
}: {
  r: Extract<Resultado<DatosRemuneraciones>, { ok: true }>;
  puede: boolean;
  abrirMutual?: boolean;
}) {
  const router = useRouter();
  return (
    <TablaRemuneraciones
      data={r.data}
      puede={puede}
      abrirMutual={abrirMutual}
      onActualizado={() => router.refresh()}
    />
  );
}
