import { MarcadorMetricas } from "@/app/_components/marcador-metricas";
import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, PilaCapas, SeccionTarjeta, TablaEstructura } from "@opai/ds";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { HojaCapaDiferida } from "@/app/_components/sueldos/diferida";
import { SelectorContexto } from "@/app/_components/sueldos/selector-contexto";
import { VersionesCapa } from "@/app/_components/sueldos/versiones-capa";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { identidadActual, contextoServidor } from "@/lib/servidor";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Capas de sueldo" };
export default function Sueldo(props: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <PaginaPersona {...props} tab="sueldo">
      {async (p, q, panel) => {
        const fecha = q["fecha"] ?? hoyIso();
        if (!panel?.efectiva) return null;
        const s = panel.efectiva;
        const identidad = await identidadActual();
        const gestionar = Boolean(
          identidad &&
          ["owner", "admin"].includes(identidad.actual?.rol ?? "") &&
          contextoServidor(identidad, "erp").autorizar(PERMISOS_CORE.estructurasManage),
        );
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="t-heading">Capas de sueldo</h2>
              {gestionar ? (
                <EnlaceBotonHoja href="?excepcion=1">Definir sueldo por RUT</EnlaceBotonHoja>
              ) : null}
            </div>
            <SelectorContexto
              fecha={fecha}
              instalaciones={panel.instalaciones.items}
              puestos={panel.puestos}
            />
            <p className="t-caption">
              Contexto explícito de consulta; no cambia el vínculo laboral. La instalación y el
              puesto se seleccionan para esta consulta.
            </p>
            <PilaCapas capa={s.capa} capas={s.niveles} />
            <p className="t-caption">Las capas no se combinan: RUT → puesto → instalación.</p>
            {s.estado === "incompleta" ? (
              <Alerta
                tono="warning"
                titulo="Estructura incompleta: define los conceptos faltantes en una nueva versión"
              >
                Faltan: {s.conceptosFaltantes.join(", ")}
              </Alerta>
            ) : null}
            {s.estructura && s.capa ? (
              <SeccionTarjeta titulo="Estructura que rige">
                <TablaEstructura
                  estructura={s.estructura}
                  origen={{ capa: s.capa, version: s.estructura.vigenteDesde }}
                />
              </SeccionTarjeta>
            ) : (
              <Alerta tono="neutral" titulo="Sin capa definida">
                Selecciona una instalación o un puesto explícito, o define un sueldo por RUT. No se
                inventan montos.
              </Alerta>
            )}
            {s.estructura?.sensible ? (
              <Alerta tono="neutral" titulo="Montos restringidos">
                Solo owner y admin ven los montos, salvo permisos explícitos de fiscalización. El
                origen permanece visible.
              </Alerta>
            ) : null}
            {q["instalacion"] ? (
              <EnlaceBoton variante="secondary" href={`/instalaciones/${q["instalacion"]}/sueldo`}>
                Ver sueldo de la instalación
              </EnlaceBoton>
            ) : null}
            <SeccionTarjeta titulo="Versiones del sueldo por RUT">
              <VersionesCapa versiones={panel.versiones} nivel="persona" gestionar={gestionar} />
            </SeccionTarjeta>
            {gestionar ? (
              <HojaCapaDiferida
                nivel="persona"
                refId={p.id}
                base={s.estructura}
                hoy={hoyIso()}
                param="excepcion"
              />
            ) : null}
            <MarcadorMetricas id="opai-metricas-sueldo" />
          </div>
        );
      }}
    </PaginaPersona>
  );
}
