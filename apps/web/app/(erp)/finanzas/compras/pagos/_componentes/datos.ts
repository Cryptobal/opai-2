import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type PagoProveedor = {
  proveedorId: string;
  rut: string;
  razonSocial: string;
  documentosConSaldo: number;
  saldoPorPagar: number;
  saldoVencido: number;
};

/** Pagos a proveedores: saldos por proveedor según la conciliación (CAR-239). */
export async function cargarPagosProveedores(sp: SearchParams) {
  const p = await leerParametros(sp);
  const listado = await ejecutarComoUsuario<{
    items: PagoProveedor[];
    totalPorPagar: number;
    siguiente: string | null;
  }>("erp", "finanzas.compras.pagos_proveedores", {
    limite: 50,
    ...(p["q"] ? { q: p["q"] } : {}),
  });
  return {
    state: estadoPantalla(listado),
    listado: listado.ok ? listado.data : null,
    filtrado: Boolean(p["q"]),
  };
}