import { Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { cargarAsistenciaPropia, TEXTOS_SIN_ASISTENCIA, textoDe } from "@/app/_components/asistencia/cargar";
import { MiRostro } from "@/app/_components/asistencia/mi-rostro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

export const metadata = { title: tituloPagina("trabajador", "Mi rostro") };

/** Portal Trabajador · Mi rostro: enrolar o revocar (L-13, L-14). Siempre puedes marcar con RUT y PIN. */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador" titulo="Mi rostro" ruta="/trabajador/mi-rostro"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }} volverSoloTelefono
      cargar={() => cargarAsistenciaPropia()}
    >
      {({ state, estado, textos }) => (
        <Estado state={state} variante="detalle" textos={{ ...TEXTOS_SIN_ASISTENCIA, error: { accion: <BotonReintentar /> } }}>
          {estado ? (
            <div className="flex max-w-md flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Mi rostro</h2>
              <MiRostro estado={estado} texto={textoDe(textos, "biometria_asistencia")} />
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
