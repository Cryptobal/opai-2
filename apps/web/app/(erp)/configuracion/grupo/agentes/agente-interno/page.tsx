import { AjustesConectados } from "../../../_centro/ajustes-conectados";
import { cargarAjustes } from "../../../_centro/ajustes-datos";
import { PaginaConfig } from "../../../_centro/pagina-config";

export const metadata = { title: "Agente interno" };

export default function AgenteInterno() {
  return (
    <PaginaConfig
      seccion="modulo-agente"
      titulo="Agente interno"
      cargar={() => cargarAjustes("agente")}
    >
      {(ajustes) => <AjustesConectados campos={ajustes.campos} valores={ajustes.valores} />}
    </PaginaConfig>
  );
}
