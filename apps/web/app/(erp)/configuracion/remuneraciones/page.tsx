import type { Resultado } from "@opai/capabilities";
import { PERMISOS_CORE } from "@opai/domain";
import { Estado, Forbidden } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { TablaRemuneraciones, type DatosRemuneraciones } from "./tabla-remuneraciones";

export const metadata = { title: "Remuneraciones" };

type Carga = { r: Resultado<DatosRemuneraciones> };

export default function Remuneraciones() {
  return (
    <PaginaConfig<Carga>
      seccion="remuneraciones"
      titulo="Remuneraciones"
      cargar={async () => {
        const r = await ejecutarComoUsuario<DatosRemuneraciones>("erp", "core.remuneraciones.listar", {});
        return { r };
      }}
      cabecera={() => ({
        subtitulo: "Indicadores legales y mutual adicional del tenant",
      })}
    >
      {({ r }, indice) => {
        const puedeLeer = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.remuneracionesRead);
        const puede = construirPuede(indice.rol, indice.acceso)(PERMISOS_CORE.remuneracionesManage);
        if (!puedeLeer) {
          return <Forbidden descripcion="Necesitas permiso de remuneraciones." />;
        }
        return (
          <Estado state={estadoPantalla(r)} variante="lista">
            {r.ok ? <TablaRemuneraciones data={r.data} puede={puede} /> : null}
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
