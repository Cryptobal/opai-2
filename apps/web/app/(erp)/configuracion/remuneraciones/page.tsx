import { PERMISOS_CORE } from "@opai/domain";
import { Estado, Forbidden } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { construirPuede } from "@/lib/permisos-ui";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { TablaRemuneraciones } from "./tabla-remuneraciones";

export const metadata = { title: "Remuneraciones" };

export default function Remuneraciones() {
  return (
    <PaginaConfig
      seccion="remuneraciones"
      titulo="Remuneraciones"
      cargar={async () => {
        const r = await ejecutarComoUsuario("erp", "core.remuneraciones.listar", {});
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
          return <Forbidden title="Sin acceso" description="Necesitas permiso de remuneraciones." />;
        }
        return (
          <Estado state={r ? estadoPantalla(r) : "error"} variante="lista">
            {r?.ok ? <TablaRemuneraciones data={r.data} puede={puede} /> : null}
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
