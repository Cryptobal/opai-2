import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import type { AlertaPlan, Cuenta } from "../../_componentes/tipos";
import { AlertasPlan } from "./alertas-plan";
import { ArbolPlan } from "./arbol-plan";
import { HojaCuenta } from "./diferidas";

import type { EstadoPantalla } from "@opai/ds";

export type DatosPlan = {
  state: EstadoPantalla;
  plan: { cuentas: Cuenta[]; alertas: AlertaPlan[]; clavesFaltantes: string[]; inicializado: boolean } | null;
  gestiona: boolean;
};

/**
 * Plan de cuentas completo (árbol, alertas, crear, editar, inicializar). Lo usa la pestaña «Plan de cuentas» de
 * Configuración › Finanzas; `prefijo` conserva la pestaña en los enlaces de la hoja.
 */
export function ContenidoPlan({ d, prefijo = "?", sinTitulo }: { d: DatosPlan; prefijo?: string; sinTitulo?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {d.gestiona && d.plan?.inicializado ? (
        <div className="flex justify-end">
          <EnlaceBotonHoja href={`${prefijo}nueva=1`} icono={Plus}>Nueva cuenta</EnlaceBotonHoja>
        </div>
      ) : null}
      <AlertasPlan alertas={d.plan?.alertas ?? []} faltantes={d.plan?.clavesFaltantes ?? []} />
      <ArbolPlan
        state={d.state}
        cuentas={d.plan?.cuentas ?? []}
        alertas={d.plan?.alertas ?? []}
        inicializado={d.plan?.inicializado ?? false}
        gestiona={d.gestiona}
        prefijo={prefijo}
        {...(sinTitulo ? { sinTitulo: true } : {})}
      />
      {d.gestiona && d.plan ? <HojaCuenta cuentas={d.plan.cuentas} /> : null}
    </div>
  );
}
