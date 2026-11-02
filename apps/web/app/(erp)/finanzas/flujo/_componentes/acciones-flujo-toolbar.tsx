"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button, Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

type Props = {
  configura: boolean;
  onImportar: () => void;
};

export function AccionesFlujoEscritorio({ configura, onImportar }: Props) {
  return (
    <div className="hidden flex-wrap gap-2 xl:flex">
      <EnlaceBoton href="/finanzas/flujo?vista=movil" variante="secondary">
        Vista celular
      </EnlaceBoton>
      {configura ? (
        <EnlaceBoton href="/configuracion/modulo/finanzas?seccion=flujo-caja" variante="secondary">
          Configurar
        </EnlaceBoton>
      ) : null}
      {configura ? (
        <Button variant="secondary" onClick={onImportar}>
          Importar CSV…
        </Button>
      ) : null}
    </div>
  );
}

export function AccionesFlujoMovil({ configura, onImportar }: Props) {
  const router = useRouter();
  if (!configura) return null;
  return (
    <div className="xl:hidden">
      <Menu
        etiqueta="Acciones del flujo"
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        items={[
          {
            id: "movil",
            etiqueta: "Vista celular",
            onSelect: () => router.push("/finanzas/flujo?vista=movil"),
          },
          {
            id: "config",
            etiqueta: "Configurar",
            onSelect: () => router.push("/configuracion/modulo/finanzas?seccion=flujo-caja"),
          },
          {
            id: "import",
            etiqueta: "Importar CSV…",
            onSelect: onImportar,
          },
        ]}
      />
    </div>
  );
}
