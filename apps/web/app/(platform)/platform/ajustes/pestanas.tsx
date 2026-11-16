import type { ReactNode } from "react";

import { Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

const TABS = [
  { id: "credenciales", etiqueta: "Credenciales", href: "/platform/ajustes/credenciales" },
  { id: "modelos", etiqueta: "Modelos y precios", href: "/platform/ajustes/modelos" },
] as const;

/** Subpestañas de Ajustes de plataforma (CAR-125): credenciales vs modelos/precios/límites. */
export function PestanasAjustes({
  activa,
  children,
}: {
  activa: (typeof TABS)[number]["id"];
  children: ReactNode;
}) {
  return (
    <Tabs Link={LinkNext} activa={activa} tabs={TABS}>
      {children}
    </Tabs>
  );
}
