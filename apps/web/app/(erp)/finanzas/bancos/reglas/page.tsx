import { PaginaPortal } from "@/app/_components/pagina-portal";

import { PestanasBancos } from "../_componentes/pestanas-bancos";
import { cargarReglas } from "./_componentes/datos";
import { PantallaReglas } from "./_componentes/pantalla-reglas";

export const metadata = { title: "Reglas del banco" };

/** Reglas del banco (CAR-328, ADR-074): clasifican movimientos a una fila del flujo y una cuenta contable. */
export default function ReglasBanco() {
  return (
    <PaginaPortal portal="erp" titulo="Bancos" ruta="/finanzas/bancos/reglas" cargar={cargarReglas}>
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasBancos activa="reglas" />
          <PantallaReglas {...d} />
        </div>
      )}
    </PaginaPortal>
  );
}
