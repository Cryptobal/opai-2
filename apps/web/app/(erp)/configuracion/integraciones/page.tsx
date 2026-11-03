import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaConfig } from "../_centro/pagina-config";
import { gruposTarjetasIntegraciones } from "./_componentes/integraciones-tarjetas";
import { TarjetaIntegracion } from "./_componentes/tarjeta-integracion";
import type { Integracion } from "./_componentes/tipos";

export const metadata = { title: "Integraciones" };

/** Integraciones (28): catálogo del núcleo con modalidad, estado y último test. */
export default function Integraciones() {
  return (
    <PaginaConfig
      seccion="integraciones"
      titulo="Integraciones"
      cargar={() => ejecutarComoUsuario<Integracion[]>("erp", "core.integraciones.list", {})}
      cabecera={() => ({
        subtitulo: "De plataforma: las provee OPAI. Propias: con tus credenciales.",
      })}
    >
      {(r) => {
        const lista = r.ok ? r.data : [];
        const grupos = gruposTarjetasIntegraciones(lista);
        return (
          <Estado state={estadoPantalla(r)} variante="lista">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {grupos.map((g) => (
                <TarjetaIntegracion key={g[0]?.proveedor ?? g[0]?.categoria} items={g} />
              ))}
            </div>
          </Estado>
        );
      }}
    </PaginaConfig>
  );
}
