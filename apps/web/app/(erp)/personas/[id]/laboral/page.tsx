import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, BadgeCapa, ParesGrid, SeccionTarjeta } from "@opai/ds";
import { MarcadorMetricas } from "@/app/_components/marcador-metricas";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { hoyIso } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { identidadActual, contextoServidor } from "@/lib/servidor";
import { HojaEditarVinculo, HojaVinculo } from "../../_componentes/diferidas";
import { HistorialVinculos, VinculoVigente } from "../../_componentes/laboral";
import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Laboral" };
export default function Laboral(props: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  return (
    <PaginaPersona {...props} tab="laboral" acciones={<></>}>
      {async (p, _q, panel) => {
        if (!panel) return null;
        const identidad = await identidadActual();
        const gestionar = Boolean(
          identidad &&
          ["owner", "admin"].includes(identidad.actual?.rol ?? "") &&
          contextoServidor(identidad, "erp").autorizar(PERMISOS_CORE.vinculosManage),
        );
        const actual = panel.vinculos.find((v) => v.estado === "vigente");
        const opciones = { instalaciones: panel.instalaciones.items, puestos: panel.puestos };
        const cargos = panel.personas.cargos ?? [];
        return (
          <div className="flex flex-col gap-4">
            {gestionar ? (
              <EnlaceBotonHoja href={actual ? "?editar-vinculo=1" : "?vinculo=1"}>
                {actual ? "Editar vínculo" : "Nuevo vínculo"}
              </EnlaceBotonHoja>
            ) : (
              <Alerta tono="neutral" titulo="Sin permiso para editar el vínculo">
                Solo owner y admin modifican el contrato.
              </Alerta>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <VinculoVigente p={p} />
                {actual ? (
                  <SeccionTarjeta titulo="Instalación y jornada pactada">
                    <ParesGrid
                      items={[
                        {
                          etiqueta: "Instalación",
                          valor:
                            opciones.instalaciones.find((i) => i.id === actual.instalacionId)
                              ?.nombre ??
                            (actual.instalacionId ? "Instalación registrada" : "Por completar"),
                        },
                        {
                          etiqueta: "Puesto (opcional)",
                          valor:
                            opciones.puestos.find((i) => i.id === actual.puestoId)?.nombre ??
                            "Sin puesto",
                        },
                        {
                          etiqueta: "Jornada pactada",
                          valor: actual.horasSemanales
                            ? `${actual.horasSemanales} h semanales · ${actual.distribucion}`
                            : "Por completar",
                        },
                      ]}
                    />
                    <p className="t-caption mt-3">PIN y Face ID siguen en Asistencia.</p>
                  </SeccionTarjeta>
                ) : null}
                {panel.efectiva ? (
                  <SeccionTarjeta titulo="Capa que resuelve este vínculo">
                    {panel.efectiva.capa ? (
                      <BadgeCapa capa={panel.efectiva.capa} />
                    ) : (
                      <p className="t-caption">Sin capa definida</p>
                    )}
                    <EnlaceBoton variante="secondary" href={`/personas/${p.id}/sueldo`}>
                      Ver sueldo
                    </EnlaceBoton>
                  </SeccionTarjeta>
                ) : null}
              </div>
              <HistorialVinculos vinculos={panel.vinculos} cargos={cargos} />
            </div>
            {gestionar && actual ? (
              <HojaEditarVinculo key={JSON.stringify(actual)} actual={actual} {...opciones} />
            ) : null}
            {gestionar && !actual ? (
              <HojaVinculo
                personaId={p.id}
                hoy={hoyIso()}
                cargos={cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
                {...opciones}
              />
            ) : null}
            <MarcadorMetricas id="opai-metricas-laboral" />
          </div>
        );
      }}
    </PaginaPersona>
  );
}
