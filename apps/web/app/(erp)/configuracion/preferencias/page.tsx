import { cargarAjustes } from "../_centro/ajustes-datos";
import { PaginaConfig } from "../_centro/pagina-config";
import { PreferenciasForm } from "./preferencias-form";
import { AreaPrincipalServidor } from "./area-principal-servidor";

export const metadata = { title: "Preferencias" };

/** Preferencias (35): solo para el usuario actual (ámbito usuario de `core.config`). */
export default function Preferencias() {
  return (
    <PaginaConfig
      seccion="preferencias"
      titulo="Preferencias"
      cargar={() => cargarAjustes("core", "Preferencias")}
      cabecera={(_, indice) => ({ subtitulo: `Solo para ti, ${indice.nombre}` })}
    >
      {({ valores }) => {
        const de = (k: string) => valores[`core.${k}`]?.valor;
        return (
          <div className="flex flex-col gap-4">
            <PreferenciasForm
              inicial={{
                tema: String(de("preferencias_tema") ?? "sistema"),
                silencio: de("preferencias_silencio") === true,
                resumen: String(de("preferencias_resumen") ?? "nunca"),
              }}
            />
            <AreaPrincipalServidor />
          </div>
        );
      }}
    </PaginaConfig>
  );
}
