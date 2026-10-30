import { AlertTriangle, Plus } from "lucide-react";

import { Alerta, Estado, Segmentado } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { HojaDia } from "./diferidas";
import { TablaDias } from "./tabla-dias";
import { ANIO_MAX, ANIO_MIN, ANIOS, type DiaVista, resolverAnio } from "./tipos";

export const metadata = { title: "Calendario" };

/**
 * Configuración → Calendario (CAR-79, ADR-018): feriados nacionales de plataforma, los regionales que
 * apliquen y los días propios de la empresa, resueltos por año. Owner y admin agregan, editan y
 * archivan los días de la empresa; el resto solo los ve.
 */
export default function Calendario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="calendario"
      titulo="Calendario"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const { anio, fueraDeRango } = resolverAnio(p["anio"]);
        // Un año fuera de rango avisa y no muestra el año por defecto en silencio: no se consulta.
        if (fueraDeRango) return { anio, fueraDeRango, editar: p["editar"] } as const;
        const r = await ejecutarComoUsuario<DiaVista[]>("erp", "core.calendario.listar", { anio });
        return { anio, fueraDeRango, r, editar: p["editar"] } as const;
      }}
      cabecera={(_, indice) => ({
        subtitulo: "Feriados y días hábiles del año",
        acciones: construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.calendarioManage) ? (
          <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
            Agregar día
          </EnlaceBotonHoja>
        ) : undefined,
      })}
    >
      {({ anio, fueraDeRango, ...rest }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.calendarioManage);
        const r = "r" in rest ? rest.r : undefined;
        const editar = rest.editar;
        const dias = r?.ok ? r.data : [];
        return (
          <div className="flex flex-col gap-4">
            <Segmentado
              etiqueta="Año"
              activa={String(anio)}
              Link={LinkNext}
              className="max-w-full self-start overflow-x-auto"
              opciones={ANIOS.map((a) => ({ id: String(a), etiqueta: String(a), href: `?anio=${a}` }))}
            />
            {fueraDeRango ? (
              <Alerta
                tono="warning"
                icono={AlertTriangle}
                titulo={`Año fuera de rango. Elige un año entre ${ANIO_MIN} y ${ANIO_MAX}.`}
              />
            ) : (
              <Estado state={r ? estadoPantalla(r) : "error"} variante="lista">
                <TablaDias dias={dias} puede={puede} />
              </Estado>
            )}
            {!fueraDeRango && puede ? (
              <>
                <HojaDia />
                {dias
                  .filter((d) => d.id === editar && d.editable)
                  .map((d) => (
                    <HojaDia key={d.id} dia={d} />
                  ))}
              </>
            ) : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}
