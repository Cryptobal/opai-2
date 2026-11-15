import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { ListaCampos, type CampoConfig } from "./lista-campos";

export const metadata = { title: "Campos personalizados" };

/**
 * Campos personalizados (CAR-27, PR 3): la empresa define campos propios para las fichas de cuentas,
 * contactos y negocios. Los valores se llenan en cada ficha. Archivar oculta el campo sin borrar lo guardado.
 */
export default function CamposPersonalizados() {
  return (
    <PaginaConfig
      seccion="campos-personalizados"
      titulo="Campos personalizados"
      cargar={() =>
        ejecutarComoUsuario<{ items: CampoConfig[] }>("erp", "core.campos_personalizados.list", {
          incluirArchivados: true,
          limite: 200,
        })
      }
      cabecera={() => ({ subtitulo: "Se llenan en la ficha de cada cuenta, contacto o negocio" })}
    >
      {(r) => (
        <Estado state={estadoPantalla(r)} variante="lista">
          <ListaCampos campos={r.ok ? r.data.items : []} />
        </Estado>
      )}
    </PaginaConfig>
  );
}
