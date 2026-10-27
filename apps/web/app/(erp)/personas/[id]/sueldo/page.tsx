import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, PilaCapas, SeccionTarjeta, TablaEstructura } from "@opai/ds";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { HojaCapaDiferida } from "@/app/_components/sueldos/diferida";
import { SelectorContexto } from "@/app/_components/sueldos/selector-contexto";
import { VersionesCapa } from "@/app/_components/sueldos/versiones-capa";
import type { EstructuraVista } from "@/lib/tipos-sueldo";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario, identidadActual, contextoServidor } from "@/lib/servidor";
import type { PuestoDeCargo, SueldoEfectivo } from "@/lib/tipos-sueldo";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Capas de sueldo" };
export default function Sueldo(props: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <PaginaPersona {...props} tab="sueldo">
      {async (p, q) => {
        const fecha = q["fecha"] ?? hoyIso();
        const [r, instalaciones, puestos, identidad, versiones] = await Promise.all([
          ejecutarComoUsuario<SueldoEfectivo>("erp", "core.estructuras.efectiva", {
            personaId: p.id,
            fecha,
            ...(q["puesto"] ? { puestoId: q["puesto"] } : {}),
            ...(q["instalacion"] ? { instalacionId: q["instalacion"] } : {}),
          }),
          ejecutarComoUsuario<{ items: { id: string; nombre: string }[] }>(
            "erp",
            "core.instalaciones.list",
            { limite: 100 },
          ),
          ejecutarComoUsuario<PuestoDeCargo[]>("erp", "core.puestos.list", {}),
          identidadActual(),
          ejecutarComoUsuario<EstructuraVista[]>("erp", "core.estructuras.list", {
            nivel: "persona",
            refId: p.id,
            incluirAnuladas: true,
          }),
        ]);
        if (!r.ok)
          return (
            <Alerta tono="danger" titulo={r.error.message}>
              <EnlaceBoton href={`/personas/${p.id}/sueldo`}>Reintentar</EnlaceBoton>
            </Alerta>
          );
        const s = r.data;
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
              instalaciones={instalaciones.ok ? instalaciones.data.items : []}
              puestos={puestos.ok ? puestos.data : []}
            />
            <p className="t-caption">
              Contexto explícito de consulta; no cambia el vínculo laboral. La instalación y el
              puesto del vínculo llegan en el PR 3.
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
              {versiones.ok ? (
                <VersionesCapa versiones={versiones.data} nivel="persona" gestionar={gestionar} />
              ) : (
                <Alerta tono="danger" titulo={versiones.error.message} />
              )}
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
          </div>
        );
      }}
    </PaginaPersona>
  );
}
