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
import { HojaTipo } from "./diferidas";
import { TablaTipos } from "./tabla-tipos";
import { CAPAS, type TipoDoc } from "./tipos";

export const metadata = { title: "Documentos" };

/** Documentos (32): tipos por capa, obligatoriedad, vencimiento, alertas y portal por defecto. */
export default function Documentos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig
      seccion="documentos"
      titulo="Documentos"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const capa = CAPAS.some((c) => c.id === p["capa"]) ? (p["capa"] ?? "persona") : "persona";
        const r = await ejecutarComoUsuario<TipoDoc[]>("erp", "core.documento_tipos.list", {
          capa,
          incluirInactivos: true,
        });
        return { capa, r, editar: p["editar"] };
      }}
      cabecera={(_, indice) => ({
        subtitulo: "Tipos de documento por capa",
        acciones: construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.documentosManage) ? (
          <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
            Nuevo tipo
          </EnlaceBotonHoja>
        ) : undefined,
      })}
    >
      {({ capa, r, editar }, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.documentosManage);
        const tipos = r.ok ? r.data.filter((t) => !t.codigo.startsWith("marca.")) : [];
        return (
          <div className="flex flex-col gap-4">
            <Segmentado
              etiqueta="Capa"
              activa={capa}
              Link={LinkNext}
              className="max-w-full self-start overflow-x-auto"
              opciones={CAPAS.map((c) => ({
                id: c.id,
                etiqueta: c.etiqueta,
                href: `?capa=${c.id}`,
              }))}
            />
            <Estado state={estadoPantalla(r)} variante="lista">
              <TablaTipos tipos={tipos} puede={puede} />
            </Estado>
            {puede ? (
              <>
                <HojaTipo capa={capa} />
                {tipos
                  .filter((t) => t.id === editar)
                  .map((t) => (
                    <HojaTipo key={t.id} capa={capa} tipo={t} />
                  ))}
              </>
            ) : null}
          </div>
        );
      }}
    </PaginaConfig>
  );
}
