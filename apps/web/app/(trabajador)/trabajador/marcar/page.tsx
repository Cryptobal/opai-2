import { Alerta, Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { cargarAsistenciaPropia, TEXTOS_SIN_ASISTENCIA, textoDe } from "@/app/_components/asistencia/cargar";
import { ConsentirTelefono } from "@/app/_components/asistencia/consentir-telefono";
import { Marcar } from "@/app/_components/asistencia/marcar";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

export const metadata = { title: tituloPagina("trabajador", "Marcar") };

/** Portal Trabajador · Marcar: solo para personas habilitadas en el canal «teléfono personal» (D-01, T-04). */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador" titulo="Marcar" ruta="/trabajador/marcar"
      volver={{ href: "/trabajador", etiqueta: "Inicio" }} volverSoloTelefono
      cargar={() => cargarAsistenciaPropia()}
    >
      {({ state, estado, textos }) => (
        <Estado state={state} variante="detalle" textos={{ ...TEXTOS_SIN_ASISTENCIA, error: { accion: <BotonReintentar /> } }}>
          {estado ? (
            <div className="flex flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Marcar</h2>
              {!estado.telefonoHabilitado || !estado.instalacionId ? (
                <Alerta tono="neutral" titulo="Aún no puedes marcar desde tu teléfono">
                  RR. HH. debe habilitarte para este canal. Mientras tanto marca en el kiosco de tu instalación.
                </Alerta>
              ) : !estado.consentimientoTelefono ? (
                <ConsentirTelefono texto={textoDe(textos, "telefono_personal_asistencia")} />
              ) : (
                <Marcar modo="telefono" nombre="" estadoInicial={estado} instalacionId={estado.instalacionId} instalacion={estado.instalacionNombre ?? undefined} textoRostro={textoDe(textos, "biometria_asistencia")} />
              )}
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
