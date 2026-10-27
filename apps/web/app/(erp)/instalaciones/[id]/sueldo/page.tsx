import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, SeccionTarjeta, TablaEstructura } from "@opai/ds";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { HojaCapaDiferida } from "@/app/_components/sueldos/diferida";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario, identidadActual, contextoServidor } from "@/lib/servidor";
import type { EstructuraVista } from "@/lib/tipos-sueldo";
import { VersionesCapa } from "@/app/_components/sueldos/versiones-capa";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaInstalacion } from "../../_componentes/pagina-instalacion";

export const metadata = { title: "Sueldo de instalación" };
export default function Sueldo(props: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <PaginaInstalacion {...props} tab="sueldo">
      {async (i, q) => {
        const puesto = i.puestos.find((p) => p.id === q["puesto"]);
        const nivel = puesto ? "puesto" : "instalacion";
        const refId = puesto?.id ?? i.id;
        const [r, identidad] = await Promise.all([
          ejecutarComoUsuario<EstructuraVista[]>("erp", "core.estructuras.list", {
            nivel,
            refId,
            incluirAnuladas: true,
          }),
          identidadActual(),
        ]);
        if (!r.ok) return <Alerta tono="danger" titulo={r.error.message} />;
        const hoy = hoyIso();
        const actual =
          r.data.find(
            (v) =>
              v.estado === "vigente" &&
              v.vigenteDesde <= hoy &&
              (!v.vigenteHasta || v.vigenteHasta >= hoy),
          ) ?? null;
        const gestionar = Boolean(
          identidad &&
          ["owner", "admin"].includes(identidad.actual?.rol ?? "") &&
          contextoServidor(identidad, "erp").autorizar(PERMISOS_CORE.estructurasManage),
        );
        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="t-heading">
                {puesto ? `Sueldo del puesto: ${puesto.nombre}` : "Sueldo de instalación"}
              </h2>
              {gestionar ? (
                <EnlaceBotonHoja href={puesto ? `?puesto=${puesto.id}&capa=1` : "?capa=1"}>
                  {actual ? "Nueva versión" : "Definir sueldo"}
                </EnlaceBotonHoja>
              ) : null}
            </div>
            <p className="t-body-sm">
              Se aplica cuando no hay sueldo por RUT ni sueldo propio de puesto. Las capas no se
              combinan.
            </p>
            {actual ? (
              <SeccionTarjeta titulo="Versión vigente">
                <TablaEstructura
                  estructura={actual}
                  origen={{ capa: nivel, version: actual.vigenteDesde }}
                />
              </SeccionTarjeta>
            ) : (
              <Alerta tono="warning" titulo="Sin capa definida">
                Los puestos sin sueldo propio quedan sin sueldo resuelto. Este aviso no bloquea la
                operación.
              </Alerta>
            )}
            <div className="flex flex-wrap gap-2">
              <EnlaceBoton variante="secondary" href={`/instalaciones/${i.id}/sueldo`}>
                Capa instalación
              </EnlaceBoton>
              {i.puestos.map((p) => (
                <EnlaceBoton
                  key={p.id}
                  variante="secondary"
                  href={`/instalaciones/${i.id}/sueldo?puesto=${p.id}`}
                >
                  {p.nombre}
                </EnlaceBoton>
              ))}
            </div>
            <SeccionTarjeta titulo="Versiones por vigencia">
              <VersionesCapa versiones={r.data} nivel={nivel} gestionar={gestionar} />
            </SeccionTarjeta>
            {gestionar ? (
              <HojaCapaDiferida nivel={nivel} refId={refId} base={actual} hoy={hoy} />
            ) : (
              <Alerta tono="neutral" titulo="Sin permiso para cambiar capas">
                Solo owner y admin pueden definir versiones.
              </Alerta>
            )}
          </div>
        );
      }}
    </PaginaInstalacion>
  );
}
