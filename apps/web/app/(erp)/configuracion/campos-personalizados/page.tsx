import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { ListaCampos } from "./lista-campos";
import type { CampoConfig, FichaConfig } from "./tipos-campo";

export const metadata = { title: "Campos personalizados" };

/**
 * Campos personalizados (CAR-27, CAR-536): la empresa define campos propios para sus fichas (las de
 * módulos activos). Los valores se llenan en cada ficha. Archivar oculta el campo sin borrar lo guardado.
 */
export default function CamposPersonalizados() {
  return (
    <PaginaConfig
      seccion="campos-personalizados"
      titulo="Campos personalizados"
      cargar={() =>
        ejecutarComoUsuario<{ items: CampoConfig[]; entidades: FichaConfig[] }>(
          "erp",
          "core.campos_personalizados.list",
          {
            incluirArchivados: true,
            limite: 200,
          },
        )
      }
      cabecera={() => ({
        subtitulo: "Se llenan en la ficha de cada cuenta, contacto, negocio, instalación o persona",
      })}
    >
      {(r) => (
        <Estado state={estadoPantalla(r)} variante="lista">
          <ListaCampos campos={r.ok ? r.data.items : []} fichas={r.ok ? r.data.entidades : []} />
        </Estado>
      )}
    </PaginaConfig>
  );
}
