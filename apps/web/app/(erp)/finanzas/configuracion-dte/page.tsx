import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarConfigDte } from "./_componentes/datos";
import { PantallaConfigDte } from "./_componentes/pantalla-config-dte";

export const metadata = { title: "Configuración DTE" };

/** Parámetros DTE del tenant (CAR-154): ambiente, SimpleAPI y resolución SII. */
export default function ConfiguracionDtePage() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Configuración DTE"
      ruta="/finanzas/configuracion-dte"
      cargar={() => cargarConfigDte()}
    >
      {(d) => <PantallaConfigDte state={d.state} cfg={d.cfg} esOwner={d.esOwner} />}
    </PaginaPortal>
  );
}
