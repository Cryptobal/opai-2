import { exigirDatos } from "@/lib/carga";
import { esUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaDetalle, CuentaFila, Pagina } from "@/lib/tipos-maestros";

import type { NegocioDetalle } from "../datos";
import { type ConfigComercial, type DatosHojas, PARAMS_HOJA } from "./tipos";

// Un id viejo en la URL (NOT_FOUND) deja la hoja sin datos; cualquier otro fallo va al error.tsx (CAR-50).
const datos = <T>(r: { ok: true; data: T } | { ok: false; error: { code: string } }) =>
  !r.ok && r.error.code === "NOT_FOUND" ? null : exigirDatos(r);

/**
 * Datos de la hoja abierta (si hay una): la configuración del embudo, el negocio (`?negocio=` en el
 * tablero o el de la ficha), las cuentas para «Nuevo negocio» y la cuenta del negocio para vincular
 * instalaciones y contactos. Sin hoja abierta no consulta nada (ADR-045: ≤ 8 consultas por navegación).
 */
export async function cargarHojas(
  p: Parametros,
  deFicha?: NegocioDetalle | null,
): Promise<DatosHojas | null> {
  const abierta = PARAMS_HOJA.find((k) => p[k]);
  if (!abierta) return null;
  const id = p["negocio"];
  const leerNegocio = !deFicha && abierta !== "nuevo" && id && esUuid(id);
  const [config, negocio, cuentas] = await Promise.all([
    ejecutarComoUsuario<ConfigComercial>("erp", "comercial.config.get", {}).then(datos),
    leerNegocio
      ? ejecutarComoUsuario<NegocioDetalle>("erp", "comercial.negocios.get", { id }).then(datos)
      : Promise.resolve(deFicha ?? null),
    abierta === "nuevo"
      ? ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", { limite: 100 }).then(
          (r) => exigirDatos(r).items,
        )
      : Promise.resolve([]),
  ]);
  const vinculos = negocio && (abierta === "instalaciones" || abierta === "contactos");
  const cuenta = vinculos
    ? datos(
        await ejecutarComoUsuario<CuentaDetalle>("erp", "core.cuentas.get", {
          id: negocio.cuentaId,
        }),
      )
    : null;
  const inicial = p["cuenta"];
  return {
    abierta,
    config,
    negocio,
    cuentas,
    cuentaInicial: inicial && esUuid(inicial) ? inicial : null,
    cuenta,
  };
}
