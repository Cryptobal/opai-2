import type { ReactNode } from "react";
import { Alerta, PilaCapas, SeccionTarjeta, TablaEstructura } from "@opai/ds";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import type { Nivel, SueldoEfectivo } from "@/lib/tipos-sueldo";

export function CascadaSueldo({ s, enlace }: {
  s: SueldoEfectivo; enlace: string; rotulos: Record<Nivel, { titulo: string; detalle: ReactNode }>;
}) {
  return <SeccionTarjeta titulo="Estructura de sueldo efectiva" accion={<EnlaceBoton href={enlace} variante="ghost">Ver capas</EnlaceBoton>}>
    <p className="t-caption mb-3">Rige una sola capa completa: RUT → puesto → instalación. No se combinan.</p>
    <PilaCapas capa={s.capa} capas={s.niveles} />
    {s.estado === "incompleta" ? <Alerta tono="warning" titulo="Estructura incompleta: define los conceptos faltantes en una nueva versión" /> : null}
    {s.estructura && s.capa ? <TablaEstructura estructura={s.estructura} origen={{ capa: s.capa, version: s.estructura.vigenteDesde }} /> : <Alerta tono="neutral" titulo="Sin capa definida" />}
  </SeccionTarjeta>;
}
