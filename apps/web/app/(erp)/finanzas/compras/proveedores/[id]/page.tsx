import { Badge, DetailScreen, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { pesos, rut, telefono } from "@/lib/fechas";

import { cargarProveedor } from "../_componentes/datos";
import { ComprasProveedor } from "../_componentes/compras-proveedor";
import { HojaProveedorDiferida } from "../_componentes/diferidas-ficha";

export const metadata = { title: "Proveedor" };

type Props = { params: Promise<{ id: string }> };

/** Ficha de proveedor (02): datos, valores por defecto y compras vinculadas. */
export default function ProveedorFicha({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Proveedor"
      ruta="/finanzas/compras/proveedores"
      cargando="detalle"
      volver={{ href: "/finanzas/compras/proveedores", etiqueta: "Proveedores" }}
      cargar={async () => cargarProveedor((await params).id)}
      opciones={(d) => ({ titulo: d.ficha?.proveedor.razonSocial ?? "Proveedor" })}
    >
      {({ state, ficha, gestiona, cuentas, centros }) => {
        const p = ficha?.proveedor;
        return (
          <DetailScreen
            state={p ? state : state === "ready" ? "error" : state}
            titulo={p?.razonSocial ?? "Proveedor"}
            {...(p
              ? {
                  estado: <Badge tono={p.activo ? "success" : "neutro"}>{p.activo ? "Activo" : "Inactivo"}</Badge>,
                  subtitulo: `${rut(p.rut)} · pago a ${p.plazoPagoDias} días`,
                  acciones: (
                    <AccionesEntidad
                      etiqueta="Acciones del proveedor"
                      acciones={gestiona ? [{ id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } }] : []}
                    />
                  ),
                }
              : {})}
          >
            {ficha && p ? (
              <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start">
                <div className="flex flex-col gap-4">
                  <SeccionTarjeta titulo="Datos">
                    <ParesGrid
                      items={[
                        { etiqueta: "RUT", valor: rut(p.rut), mono: true },
                        { etiqueta: "Giro", valor: p.giro ?? "—" },
                        { etiqueta: "Correo", valor: p.email ?? "—" },
                        { etiqueta: "Teléfono", valor: telefono(p.telefono) },
                        { etiqueta: "Plazo de pago", valor: `${p.plazoPagoDias} días` },
                      ]}
                    />
                  </SeccionTarjeta>
                  <SeccionTarjeta titulo="Valores por defecto">
                    <ParesGrid
                      items={[
                        { etiqueta: "Cuenta de gasto", valor: ficha.cuentaGasto ? `${ficha.cuentaGasto.codigo} · ${ficha.cuentaGasto.nombre}` : "—" },
                        { etiqueta: "Cuenta por pagar", valor: ficha.cuentaPorPagar ? `${ficha.cuentaPorPagar.codigo} · ${ficha.cuentaPorPagar.nombre}` : "—" },
                        { etiqueta: "Centro de costo", valor: ficha.centroCostoNombre ?? "—" },
                      ]}
                    />
                  </SeccionTarjeta>
                </div>
                <SeccionTarjeta titulo="Compras vinculadas">
                  <p className="mb-2 text-sm text-fg-muted">
                    {ficha.resumen.documentos} documentos · Neto {pesos(ficha.resumen.montoNeto)}
                    {ficha.resumen.sinCentroCosto ? ` · ${ficha.resumen.sinCentroCosto} sin centro de costo` : ""}
                  </p>
                  <ComprasProveedor compras={ficha.compras} />
                  <p className="mt-3 text-sm text-fg-subtle">Los pagos se vincularán aquí cuando exista la conciliación bancaria.</p>
                </SeccionTarjeta>
                {gestiona ? <HojaProveedorDiferida proveedor={p} cuentas={cuentas} centros={centros} /> : null}
              </div>
            ) : null}
          </DetailScreen>
        );
      }}
    </PaginaPortal>
  );
}
