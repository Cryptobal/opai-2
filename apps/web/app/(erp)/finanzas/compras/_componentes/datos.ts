import { hoyIso } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { Centro, Libro, Proveedor } from "../../_componentes/tipos";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Últimos 12 meses como opciones del filtro de período (`aaaa-mm`, «octubre 2026»). */
export function periodosRecientes(hoy = hoyIso()) {
  const [a, m] = hoy.split("-").map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const total = a * 12 + (m - 1) - i;
    const anio = Math.floor(total / 12);
    const mes = total % 12;
    return { valor: `${anio}-${String(mes + 1).padStart(2, "0")}`, etiqueta: `${MESES[mes]} ${anio}` };
  });
}

/** Libro de compras con los filtros de la URL, más lo que necesitan las hojas de escritura. */
export async function cargarLibro(sp: SearchParams) {
  const p = await leerParametros(sp);
  const identidad = await requerirIdentidad("/finanzas/compras");
  const puede = puedeDeIdentidad(identidad);
  const gestiona = puede("finanzas:compras.manage");
  const puedeCrearProveedores = puede("finanzas:proveedores.manage");
  const [libro, centros, proveedores] = await Promise.all([
    ejecutarComoUsuario<Libro>("erp", "finanzas.compras.listar", {
      limite: 100,
      ...(p["periodo"] ? { periodo: p["periodo"] } : {}),
      ...(p["q"] ? { q: p["q"] } : {}),
      ...(p["sin_centro"] === "1" ? { sinCentroCosto: true } : {}),
    }),
    ejecutarComoUsuario<Centro[]>("erp", "finanzas.centros_costo.listar", {}),
    gestiona
      ? ejecutarComoUsuario<{ items: Proveedor[] }>("erp", "finanzas.proveedores.listar", { limite: 100 })
      : null,
  ]);
  return {
    state: estadoPantalla(libro),
    libro: libro.ok ? libro.data : null,
    centros: centros.ok ? centros.data : [],
    proveedores: proveedores?.ok ? proveedores.data.items : [],
    gestiona,
    puedeCrearProveedores,
    filtrado: Boolean(p["periodo"] || p["q"] || p["sin_centro"]),
  };
}
