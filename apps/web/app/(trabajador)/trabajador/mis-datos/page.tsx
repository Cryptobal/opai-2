import { Cabecera, Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FormularioDatos } from "../_componentes/formulario-datos";
import { FichaIdentidadTrabajador } from "../_componentes/ficha-identidad";
import { estadoTrabajador, SIN_FICHA } from "../_componentes/estado";
import type { MisDatos } from "../_componentes/tipos";

export const metadata = { title: tituloPagina("trabajador", "Mis datos") };

export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Mis datos"
      ruta="/trabajador/mis-datos"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
      cargar={async () => {
        const r = await ejecutarComoUsuario<MisDatos>(
          "trabajador",
          "portal_trabajador.mis_datos.obtener",
        );
        return { state: estadoTrabajador(r), datos: r.ok ? r.data : null };
      }}
    >
      {({ state, datos }) => (
        <Estado
          state={state}
          variante="formulario"
          textos={{ vacio: SIN_FICHA, error: { accion: <BotonReintentar /> } }}
        >
          {datos ? (
            <div className="flex flex-col gap-4">
              <FichaIdentidadTrabajador datos={datos} />
              <FormularioDatos
                inicial={datos}
                cabecera={
                  <Cabecera
                    titulo="Mis datos"
                    subtitulo="Mantén tu contacto y tu dirección al día."
                  />
                }
              />
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
