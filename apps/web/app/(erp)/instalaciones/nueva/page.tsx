import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { CuentaFila, InstalacionFila, Pagina } from "@/lib/tipos-maestros";
import { vocabularioActual } from "@/lib/vocabulario";

import { NuevaInstalacion } from "./nueva-instalacion";

export const metadata = { title: "Nueva instalación" };

/** Nueva instalación (40): cuenta con búsqueda, datos y dirección, y copiar puestos de otra instalación. */
export default function Nueva({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Nueva instalación"
      ruta="/instalaciones/nueva"
      cargando="formulario"
      cargar={async () => {
        const [p, voc, cuentas, inst] = await Promise.all([
          leerParametros(searchParams),
          vocabularioActual(),
          ejecutarComoUsuario<Pagina<CuentaFila>>("erp", "core.cuentas.list", { limite: 100 }),
          ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", {
            limite: 100,
          }),
        ]);
        return {
          cuenta: p["cuenta"] ?? null,
          voc,
          state: estadoPantalla(cuentas),
          cuentas: cuentas.ok ? cuentas.data.items : [],
          instalaciones: inst.ok ? inst.data.items : [],
        };
      }}
      opciones={(d) => ({
        titulo: `Nueva ${d.voc.instalacion.singular}`,
        volver: { href: "/instalaciones", etiqueta: d.voc.titulo("instalacion") },
      })}
    >
      {(d) => (
        <NuevaInstalacion
          cuentaInicial={d.cuenta}
          cuentas={d.cuentas}
          instalaciones={d.instalaciones}
        />
      )}
    </PaginaPortal>
  );
}
