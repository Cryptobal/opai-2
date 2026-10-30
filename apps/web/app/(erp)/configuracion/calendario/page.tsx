import { Plus } from "lucide-react";

import { Estado, Segmentado } from "@opai/ds";
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
import { ANIO_DEFECTO, ANIOS, type DiaVista } from "./tipos";

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
        const anio = ANIOS.map(String).includes(p["anio"] ?? "") ? Number(p["anio"]) : ANIO_DEFECTO;
        const r = await ejecutarComoUsuario<DiaVista[]>("erp", "core.calendario.listar", { anio });
        return { anio, r, editar: p["editar"] };
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
      {({ anio, r, editar }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.calendarioManage);
        const dias = r.ok ? r.data : [];
        return (
          <div className="flex flex-col gap-4">
            <Segmentado
              etiqueta="Año"
              activa={String(anio)}
              Link={LinkNext}
              className="max-w-full self-start overflow-x-auto"
              opciones={ANIOS.map((a) => ({ id: String(a), etiqueta: String(a), href: `?anio=${a}` }))}
            />
            <Estado state={estadoPantalla(r)} variante="lista">
              <TablaDias dias={dias} puede={puede} />
            </Estado>
            {puede ? (
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
