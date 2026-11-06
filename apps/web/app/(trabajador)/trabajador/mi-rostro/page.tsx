import { Card, CardContent, Estado } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { cargarMiBiometria, TEXTOS_SIN_MARCAS, textoDe } from "@/app/_components/biometria/cargar";
import { EnrolarPropio } from "@/app/_components/biometria/enrolar-propio";
import { RevocarRostro } from "@/app/_components/biometria/revocar-rostro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

export const metadata = { title: tituloPagina("trabajador", "Mi rostro") };

/** Portal Trabajador · Mi rostro: enrolar o revocar (L-13, L-14). Siempre puedes marcar con RUT y PIN. */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="trabajador" titulo="Mi rostro" ruta="/trabajador/mi-rostro"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }} volverSoloTelefono
      cargar={() => cargarMiBiometria("trabajador")}
    >
      {({ state, estado, textos }) => (
        <Estado state={state} variante="detalle" textos={{ ...TEXTOS_SIN_MARCAS, error: { accion: <BotonReintentar /> } }}>
          {estado ? (
            <div className="flex max-w-md flex-col gap-4">
              <h2 className="t-title text-fg md:hidden">Mi rostro</h2>
              <Card>
                <CardContent className="flex flex-col gap-4">
                  {estado.rostroEnrolado ? (
                    <>
                      <p className="text-md text-fg">Tu rostro está enrolado. Si falla, siempre puedes marcar con tu RUT y PIN.</p>
                      <RevocarRostro portal="trabajador" />
                    </>
                  ) : (
                    <EnrolarPropio portal="trabajador" estado={estado} texto={textoDe(textos, "biometria_facial")} onListo={() => undefined} />
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </Estado>
      )}
    </PaginaPortal>
  );
}
