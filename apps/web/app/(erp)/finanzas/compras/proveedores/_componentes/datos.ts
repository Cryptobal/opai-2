import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { Centro, Compra, Cuenta, Proveedor } from "../../../_componentes/tipos";

export type FichaProveedor = {
  proveedor: Proveedor;
  cuentaGasto: { id: string; codigo: string; nombre: string } | null;
  cuentaPorPagar: { id: string; codigo: string; nombre: string } | null;
  centroCostoNombre: string | null;
  resumen: { documentos: number; sinCentroCosto: number; montoNeto: number };
  compras: Compra[];
};

/** Datos que necesita el formulario de proveedor: cuentas del plan y centros de costo. */
async function opcionesFormulario() {
  const [plan, centros] = await Promise.all([
    ejecutarComoUsuario<{ cuentas: Cuenta[] }>("erp", "finanzas.plan.listar", { incluirInactivas: false }),
    ejecutarComoUsuario<Centro[]>("erp", "finanzas.centros_costo.listar", {}),
  ]);
  return {
    cuentas: plan.ok ? plan.data.cuentas.filter((c) => c.aceptaAsientos) : [],
    centros: centros.ok ? centros.data : [],
  };
}

export async function cargarProveedores(sp: SearchParams) {
  const p = await leerParametros(sp);
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/compras/proveedores"));
  const gestiona = puede("finanzas:proveedores.manage");
  const [lista, opciones] = await Promise.all([
    ejecutarComoUsuario<{ items: Proveedor[] }>("erp", "finanzas.proveedores.listar", {
      limite: 100,
      soloActivos: p["estado"] !== "todos",
      ...(p["q"] ? { q: p["q"] } : {}),
    }),
    gestiona ? opcionesFormulario() : { cuentas: [], centros: [] },
  ]);
  return {
    state: estadoPantalla(lista),
    items: lista.ok ? lista.data.items : [],
    gestiona,
    filtrado: Boolean(p["q"] || p["estado"]),
    ...opciones,
  };
}

export async function cargarProveedor(id: string) {
  requerirUuid(id);
  const puede = puedeDeIdentidad(await requerirIdentidad("/finanzas/compras/proveedores"));
  const gestiona = puede("finanzas:proveedores.manage");
  const [ficha, opciones] = await Promise.all([
    ejecutarComoUsuario<FichaProveedor>("erp", "finanzas.proveedores.obtener", { id }),
    gestiona ? opcionesFormulario() : { cuentas: [], centros: [] },
  ]);
  requerirEncontrado(ficha);
  return { state: estadoPantalla(ficha), ficha: ficha.ok ? ficha.data : null, gestiona, ...opciones };
}
