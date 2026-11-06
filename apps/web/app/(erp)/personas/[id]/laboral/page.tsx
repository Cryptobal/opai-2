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
import { SeccionContactoLaboral } from "../../_componentes/seccion-contacto-laboral";
import { SeccionJornadaDt } from "../../_componentes/seccion-jornada-dt";
import { SeccionOs10 } from "../../_componentes/seccion-os10";
import { SeccionPago } from "../../_componentes/seccion-pago";
import { SeccionPrevision } from "../../_componentes/seccion-prevision";
import { SeccionPinTerreno } from "../../_componentes/seccion-pin-terreno";
import { SeccionUniforme } from "../../_componentes/seccion-uniforme";

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
        const retirado = panel.cargosRetirados.find((c) => c.cargoId === actual?.cargoId);
        const opcionesCargo = [
          ...cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
          ...(retirado && !cargos.some((c) => c.id === retirado.cargoId)
            ? [{ valor: retirado.cargoId, etiqueta: `${retirado.cargo} (retirado)` }]
            : []),
        ];
        return (
          <div className="flex flex-col gap-4">
            {gestionar ? (
              <div className="flex flex-col items-start gap-1.5">
                <EnlaceBotonHoja href={actual ? "?editar-vinculo=1" : "?vinculo=1"}>
                  {actual ? "Cambiar cargo, contrato, instalación o jornada" : "Nuevo vínculo"}
                </EnlaceBotonHoja>
                <p className="t-caption">
                  {actual
                    ? "Modifica el contrato vigente. Para terminarlo, usa «Terminar vínculo» del menú ⋯."
                    : "La persona no tiene un contrato vigente."}
                </p>
              </div>
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
              <HistorialVinculos
                vinculos={panel.vinculos}
                cargos={cargos}
                cargosRetirados={panel.cargosRetirados}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SeccionPrevision personaId={p.id} />
              <SeccionPago personaId={p.id} />
              <SeccionUniforme personaId={p.id} />
              <SeccionJornadaDt personaId={p.id} />
              <SeccionOs10 personaId={p.id} />
              <SeccionPinTerreno personaId={p.id} nombre={`${p.nombres} ${p.apellidos}`} />
              <SeccionContactoLaboral personaId={p.id} />
            </div>
            {gestionar && actual ? (
              <HojaEditarVinculo
                key={JSON.stringify(actual)}
                actual={actual}
                cargos={opcionesCargo}
                {...opciones}
              />
            ) : null}
            {gestionar && !actual ? (
              <HojaVinculo personaId={p.id} hoy={hoyIso()} cargos={opcionesCargo} {...opciones} />
            ) : null}
            <MarcadorMetricas id="opai-metricas-laboral" />
          </div>
        );
      }}
    </PaginaPersona>
  );
}
