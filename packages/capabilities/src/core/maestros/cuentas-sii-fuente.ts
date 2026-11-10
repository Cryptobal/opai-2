import {
  contribuyenteNoConfigurado,
  contribuyenteSimpleApi,
  type ConsultaContribuyente,
  type DatosContribuyente,
  type ResultadoContribuyente,
} from "@opai/integrations";
import { listaParaFacturar } from "@opai/domain";

import { consumoBase } from "../../integraciones/consumo-base";
import { credencialDe, integracionDe } from "../../integraciones/resolver";
import type { Contexto } from "../../types";

/** Fuente de prueba (tests y e2e): reemplaza al proveedor real sin tocar el almacén de secretos. */
let fuenteFija: ConsultaContribuyente | null = null;
export function fijarFuenteContribuyente(f: ConsultaContribuyente | null) {
  fuenteFija = f;
}

/** Proveedor efectivo: la key propia del tenant (`sii_contribuyente`) o «no configurado». */
export async function fuenteContribuyente(ctx: Contexto): Promise<ConsultaContribuyente> {
  if (fuenteFija) return fuenteFija;
  const cred = await credencialDe(ctx, "sii_contribuyente");
  return cred ? contribuyenteSimpleApi(cred.valor) : contribuyenteNoConfigurado();
}

/**
 * Si hay proveedor configurado, sin descifrar la key (CAR-156): el alta y el importador solo necesitan
 * saber si encolar. Misma regla que `credencialDe` para la modalidad propia (la única de esta integración).
 */
export async function contribuyenteConfigurado(ctx: Contexto): Promise<boolean> {
  if (fuenteFija) return fuenteFija.disponible;
  const fila = await integracionDe(ctx, "sii_contribuyente");
  if (fila?.modalidad !== "propia") return false;
  const n = await ctx.db.secreto.count({ where: { integracionId: fila.id, nombre: "api_key" } });
  return n > 0;
}

/**
 * Sale al proveedor y mide la llamada (ADR-031) solo cuando de verdad salió. Nadie la llama directo:
 * pasa por `consultarContribuyente` (caché, CAR-156) o por el trabajo encolado.
 */
export async function consultarProveedor(
  ctx: Contexto,
  rut: string,
): Promise<ResultadoContribuyente> {
  const fuente = await fuenteContribuyente(ctx);
  const r = await fuente.consultar(rut);
  if (fuente.disponible && r.estado !== "no_configurado") {
    await ctx.medidor
      .registrar({
        ...consumoBase(ctx, "core"),
        recurso: "sii.contribuyente",
        unidad: "consulta",
        cantidad: 1,
        sinCosto: true,
        yaIncurrido: true,
      })
      .catch(() => undefined);
  }
  return r;
}

/** Valores del SII proyectados a los campos de la cuenta (giro = actividad principal). */
export function valoresSii(d: DatosContribuyente) {
  return {
    razonSocial: d.razonSocial || null,
    giro: d.actividades[0]?.descripcion ?? null,
    calle: d.direccion,
    comuna: d.comuna,
    ciudad: d.ciudad,
    emailDte: d.correoIntercambio,
  };
}

/** «Lista para facturar» de una cuenta, con los contactos de facturación vinculados. */
export async function facturableDe(
  ctx: Contexto,
  c: {
    id: string;
    rut: string | null;
    razonSocial: string | null;
    giro: string | null;
    calle: string | null;
    comuna: string | null;
    emailDte: string | null;
  },
) {
  const contactosFacturacion = await ctx.db.contactoCuenta.count({
    where: { cuentaId: c.id, roles: { has: "facturacion" } },
  });
  return listaParaFacturar({ ...c, contactosFacturacion });
}
