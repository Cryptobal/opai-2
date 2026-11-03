import type { Resultado } from "@opai/capabilities";
import { PERMISOS_CORE } from "@opai/domain";
import { Estado, Forbidden } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { RemuneracionesCliente } from "./remuneraciones-cliente";
import type { DatosRemuneraciones } from "./tabla-remuneraciones";

export const metadata = { title: "Remuneraciones" };

type Carga = { r: Resultado<DatosRemuneraciones>; abrirMutual: boolean };

/** `?mutual=1` abre la confirmación de la mutual adicional (enlace desde CPQ, CAR-162). */
export default function Remuneraciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaConfig<Carga>
      seccion="remuneraciones"
      titulo="Remuneraciones"
      cargar={async () => {
        const [r, p] = await Promise.all([
          ejecutarComoUsuario<DatosRemuneraciones>("erp", "core.remuneraciones.listar", {}),
          leerParametros(searchParams),
        ]);
        return { r, abrirMutual: p["mutual"] === "1" };
      }}
      cabecera={() => ({
        subtitulo: "Indicadores legales y cotización adicional de la mutual",
      })}
    >
      {({ r, abrirMutual }, indice) => {
        const puedeLeer = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.remuneracionesRead);
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.remuneracionesManage);
        if (!puedeLeer) {
          return <Forbidden descripcion="Necesitas permiso de remuneraciones." />;
        }
        return (
          <Estado state={estadoPantalla(r)} variante="lista">
            {r.ok ? (
              <RemuneracionesCliente r={r} puede={puede} abrirMutual={abrirMutual && puede} />
            ) : null}
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
