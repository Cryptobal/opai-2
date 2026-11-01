import { UserCheck } from "lucide-react";

import { Alerta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { BuscadorConfig, type EntradaBuscador } from "./_centro/buscador-config";
import { agruparVisibles, cargarIndice } from "./_centro/datos";
import { TarjetaGrupo } from "./_centro/tarjeta-grupo";

export const metadata = { title: "Configuración" };

/**
 * Portada del centro de Configuración (brief §4.1): buscador de ajustes, aviso de aprobaciones y una
 * grilla de tarjetas de grupo sin contadores. Cada tarjeta lleva a la primera entrada visible del
 * grupo (iPad/escritorio) o a la lista del grupo (teléfono).
 */
export default function Configuracion({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Configuración"
      ruta="/configuracion"
      completo
      cargar={async () => {
        const [indice, p] = await Promise.all([cargarIndice(), leerParametros(searchParams)]);
        return { indice, q: p["q"] };
      }}
    >
      {({ indice, q }) => {
        const grupos = agruparVisibles(indice.secciones);
        const entradas: EntradaBuscador[] = grupos.flatMap((g) =>
          g.entradas.map((e) => ({
            id: e.id,
            titulo: e.titulo,
            descripcion: e.descripcion,
            grupoId: g.grupo.id,
            grupoEtiqueta: g.grupo.etiqueta,
            href: e.href,
          })),
        );
        const veAprobaciones = indice.secciones.some((s) => s.id === "aprobaciones");
        const n = indice.aprobaciones;
        return (
          <div className="flex flex-col gap-5">
            <h2 className="t-title text-fg md:hidden">Configuración</h2>
            {veAprobaciones && n > 0 ? (
              <Alerta
                tono="warning"
                icono={UserCheck}
                titulo={`${n} ${n === 1 ? "aprobación de agente espera" : "aprobaciones de agentes esperan"} tu revisión`}
                accion={
                  <EnlaceBoton href="/configuracion/aprobaciones" variante="ghost">
                    Revisar
                  </EnlaceBoton>
                }
              />
            ) : null}
            <BuscadorConfig
              entradas={entradas}
              grupos={grupos.map((g) => ({ id: g.grupo.id, etiqueta: g.grupo.etiqueta }))}
              inicial={q}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {grupos.map((g) => (
                  <TarjetaGrupo key={g.grupo.id} grupo={g.grupo} entradas={g.entradas} />
                ))}
              </div>
            </BuscadorConfig>
          </div>
        );
      }}
    </PaginaPortal>
  );
}
