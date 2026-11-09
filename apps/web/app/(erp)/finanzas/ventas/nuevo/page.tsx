import { redirect } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { CuentaFila, Pagina } from "@/lib/tipos-maestros";

import { FormularioEmitirDiferido } from "./formulario-emitir-diferido";

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
          return { state: "forbidden" as const, cuentas: [] as CuentaFila[], sinRut: 0 };
        }
        // Clientes facturables: activos y con RUT (el DTE exige el RUT del receptor). Los activos sin RUT se cuentan
        // para explicar por qué no aparecen.
        const cuentas = await ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", {
          limite: 200,
          estado: "cliente_activo",
        });
        const activas = cuentas.ok ? cuentas.data.items : [];
        const facturables = activas.filter((c) => Boolean(c.rut?.trim()));
        return { state: estadoPantalla(cuentas), cuentas: facturables, sinRut: activas.length - facturables.length };
      }}
      opciones={() => ({
        titulo: "Emitir factura electrónica",
        volver: { href: "/finanzas/ventas", etiqueta: "Ventas (DTE)" },
      })}
    >
      {(d) => {
        if (d.state === "forbidden") redirect("/finanzas/ventas");
        return <FormularioEmitirDiferido cuentas={d.cuentas} sinRut={d.sinRut} />;
      }}
    </PaginaPortal>
  );
}
