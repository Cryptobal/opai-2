"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@opai/ds";

import type { VinculoContacto } from "./vinculos-tipos";

// Aparte (next/dynamic, ADR-037): vincular y editar cuentas no pesa en el JS inicial de /contactos/[id].
const ListaVinculos = dynamic(
  () => import("./lista-vinculos").then((m) => ({ default: m.ListaVinculos })),
  { loading: () => <Skeleton className="h-48 w-full" /> },
);

export function ListaVinculosDiferida(p: {
  contactoId: string;
  vinculos: VinculoContacto[];
  gestionar: boolean;
}) {
  return <ListaVinculos {...p} />;
}
