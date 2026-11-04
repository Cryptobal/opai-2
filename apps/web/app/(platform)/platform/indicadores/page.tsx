import dynamic from "next/dynamic";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import type { DatosIndicadores } from "./_componentes/tipos";

export const metadata = { title: "Valores legales" };

const PropuestasIndicadores = dynamic(() =>
  import("./_componentes/propuestas-indicadores").then((m) => m.PropuestasIndicadores),
);

/** Plataforma → Valores legales: lo que la captura mensual de Previred propone y una persona aprueba. */
export default function Indicadores() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Valores legales"
      ruta="/platform/indicadores"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () =>
        exigirDatos(await ejecutarComoUsuario<DatosIndicadores>("platform", "platform.indicadores.propuestas", {}))
      }
    >
      {(d) => (
        <>
          <h2 className="t-title mb-3 text-fg md:hidden">Valores legales</h2>
          <PropuestasIndicadores datos={d} />
        </>
      )}
    </PaginaPortal>
  );
}
