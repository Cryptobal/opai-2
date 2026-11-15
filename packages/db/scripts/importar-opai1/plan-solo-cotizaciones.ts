// Modo «solo cotizaciones» (CAR-326): deja el plan en lo que ya está en 2.0 más las cotizaciones.
// Cuentas, contactos, instalaciones, programaciones y negocios no se crean ni se completan: solo
// sirven (los que ya existen) para colgar cada cotización de su negocio.
import { type Decision, decision } from "./comun";
import type { DatosCotizacion } from "./cotizaciones-tipos";
import type { Plan } from "./plan";

const yaExisten = <T>(ds: readonly Decision<T>[]) => ds.filter((d) => d.accion === "sin_cambios");

export function soloCotizaciones(plan: Plan): Plan {
  const negocios = yaExisten(plan.negocios);
  const hay = new Set(negocios.map((d) => d.idOpai1));
  const cotizaciones: Decision<DatosCotizacion>[] = plan.cotizaciones.map((d) =>
    d.accion === "crear" && d.datos && !hay.has(d.datos.negocioIdOpai1)
      ? decision("cotizacion", d.idOpai1, "omitido", { motivo: "negocio_no_importado" })
      : d,
  );
  return {
    ...plan,
    cuentas: yaExisten(plan.cuentas),
    contactos: yaExisten(plan.contactos),
    instalaciones: yaExisten(plan.instalaciones),
    programaciones: [],
    negocios,
    cotizaciones,
    comercial: { ...plan.comercial, cotizaciones },
  };
}
