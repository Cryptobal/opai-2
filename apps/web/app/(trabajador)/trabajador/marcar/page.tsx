import { Alerta, Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { cargarMiBiometria, TEXTOS_SIN_MARCAS, textoDe } from "@/app/_components/biometria/cargar";
import { ConsentirTelefono } from "@/app/_components/biometria/consentir-telefono";
import { MarcarPersona } from "@/app/_components/biometria/marcar-persona";
import { consentido } from "@/app/_components/biometria/tipos";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

export const metadata = { title: tituloPagina("trabajador", "Marcar") };

/** Portal Trabajador · Marcar: solo para personas habilitadas en el canal «teléfono personal» (D-01, T-04). */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador" titulo="Marcar" ruta="/trabajador/marcar"
      volver={{ href: "/trabajador", etiqueta: "Inicio" }} volverSoloTelefono
      cargar={() => cargarMiBiometria("trabajador")}
    >
      {({ state, estado, textos }) => (
        <Estado state={state} variante="detalle" textos={{ ...TEXTOS_SIN_MARCAS, error: { accion: <BotonReintentar /> } }}>
          {estado ? (
            <div className="flex flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Marcar</h2>
              {!estado.telefonoPersonalHabilitado || !estado.yo?.instalacionId ? (
                <Alerta tono="neutral" titulo="Aún no puedes marcar desde tu teléfono">
                  RR. HH. debe habilitarte para este canal. Mientras tanto marca en el kiosco de tu instalación.
                </Alerta>
              ) : !consentido(estado, "telefono_personal") ? (
                <ConsentirTelefono texto={textoDe(textos, "telefono_personal")} />
              ) : (
                <MarcarPersona
                  portal="trabajador" canal="telefono_personal" estado={estado} instalacionId={estado.yo.instalacionId}
                  instalacion={estado.yo.instalacionNombre ?? "Tu instalación"} textoRostro={textoDe(textos, "biometria_facial")}
                />
              )}
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
