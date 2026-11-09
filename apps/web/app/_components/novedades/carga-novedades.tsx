"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@opai/ds";

const ListaNovedades = dynamic(() => import("./lista-novedades").then((m) => m.ListaNovedades), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

export function CargaNovedades({ portal }: { portal: string }) {
  return <ListaNovedades portal={portal} />;
}
