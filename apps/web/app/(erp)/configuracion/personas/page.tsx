import { PERMISOS_CORE } from "@opai/domain";
import { Forbidden, SeccionTarjeta } from "@opai/ds";

import { construirPuede } from "@/lib/permisos-ui";

import { AjustesConectados } from "../_centro/ajustes-conectados";
import { cargarAjustes } from "../_centro/ajustes-datos";
import { PaginaConfig } from "../_centro/pagina-config";

export const metadata = { title: "Personas" };

/**
 * Ajustes de Personas del núcleo (CAR-355): los pasos de ingreso y de salida que se abren al crear o
 * terminar un vínculo (vacío = los del rubro de la empresa) y la vigencia de «No recontratar».
 */
export default function ConfigPersonas() {
  return (
    <PaginaConfig
      seccion="personas"
      titulo="Personas"
      cargar={() => cargarAjustes("core", "Personas")}
      cabecera={() => ({ subtitulo: "Pasos de ingreso y salida, y marca «No recontratar»" })}
    >
      {(ajustes, indice) => {
        const puede = construirPuede(indice.rol, indice.acceso);
        if (!puede(PERMISOS_CORE.vinculosRead))
          return <Forbidden descripcion="Necesitas permiso para ver los vínculos laborales." />;
        return (
          <SeccionTarjeta titulo="Ajustes">
            <p className="t-caption mb-3">
              Los pasos se escriben como lista: título y plazo en días desde el inicio (ingreso) o el término
              (salida) del contrato. Si dejas una lista vacía, se usan los pasos de tu rubro.
            </p>
            <AjustesConectados
              campos={ajustes.campos.filter((c) => c.ambito === "tenant")}
              valores={ajustes.valores}
            />
          </SeccionTarjeta>
        );
      }}
    </PaginaConfig>
  );
}
