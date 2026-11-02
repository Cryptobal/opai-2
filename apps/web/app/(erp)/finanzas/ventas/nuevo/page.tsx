import { redirect } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { CuentaFila, Pagina } from "@/lib/tipos-maestros";

import { FormularioEmitir } from "./formulario-emitir";

export const metadata = { title: "Emitir DTE" };

/** Nueva factura 33/34 · borrador y emisión (CAR-137, diseño Finanzas v3). */
export default async function EmitirVentaPage() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Emitir DTE"
      ruta="/finanzas/ventas/nuevo"
      cargando="formulario"
      cargar={async () => {
        const identidad = await requerirIdentidad("/finanzas/ventas/nuevo");
        if (!puedeDeIdentidad(identidad)("finanzas:ventas.manage")) {
          return { state: "forbidden" as const, cuentas: [] as CuentaFila[] };
        }
        const cuentas = await ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", {
          limite: 200,
        });
        return {
          state: estadoPantalla(cuentas),
          cuentas: cuentas.ok ? cuentas.data.items : [],
        };
      }}
      opciones={() => ({
        titulo: "Emitir factura electrónica",
        volver: { href: "/finanzas/ventas", etiqueta: "Ventas (DTE)" },
      })}
    >
      {(d) => {
        if (d.state === "forbidden") redirect("/finanzas/ventas");
        return <FormularioEmitir cuentas={d.cuentas} />;
      }}
    </PaginaPortal>
  );
}
