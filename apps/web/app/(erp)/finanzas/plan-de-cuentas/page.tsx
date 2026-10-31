import { Plus } from "lucide-react";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { AlertasPlan } from "./_componentes/alertas-plan";
import { ArbolPlan } from "./_componentes/arbol-plan";
import { cargarPlan } from "./_componentes/datos";
import { HojaCuenta } from "./_componentes/diferidas";

export const metadata = { title: "Plan de cuentas" };

/** Plan de cuentas (06): árbol por tipo con grupo, naturaleza y alertas de validación. */
export default function PlanDeCuentas() {
  return (
    <PaginaPortal portal="erp" titulo="Plan de cuentas" ruta="/finanzas/plan-de-cuentas" cargar={cargarPlan}>
      {(d) => (
        <div className="flex flex-col gap-4">
          {d.gestiona && d.plan?.inicializado ? (
            <div className="flex justify-end">
              <EnlaceBotonHoja href="?nueva=1" icono={Plus}>Nueva cuenta</EnlaceBotonHoja>
            </div>
          ) : null}
          <AlertasPlan alertas={d.plan?.alertas ?? []} faltantes={d.plan?.clavesFaltantes ?? []} />
          <ArbolPlan
            state={d.state}
            cuentas={d.plan?.cuentas ?? []}
            alertas={d.plan?.alertas ?? []}
            inicializado={d.plan?.inicializado ?? false}
            gestiona={d.gestiona}
          />
          {d.gestiona && d.plan ? <HojaCuenta cuentas={d.plan.cuentas} /> : null}
        </div>
      )}
    </PaginaPortal>
  );
}
