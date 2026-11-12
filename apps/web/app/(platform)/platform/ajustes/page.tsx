import dynamic from "next/dynamic";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import type { Ajuste, Precio } from "./_componentes/tipos";

export const metadata = { title: "Ajustes de plataforma" };

const AjustesPlataforma = dynamic(() =>
  import("./_componentes/ajustes-plataforma").then((m) => m.AjustesPlataforma),
);

/** Plataforma → Ajustes (50): lo que OPAI fija para todas las empresas. */
export default function Ajustes() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Ajustes de plataforma"
      ruta="/platform/ajustes"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const [p, a, t] = await Promise.all([
          ejecutarComoUsuario<Precio[]>("platform", "platform.precios.list", {}),
          ejecutarComoUsuario<Ajuste[]>("platform", "platform.ajustes.get", {}),
          ejecutarComoUsuario<unknown[]>("platform", "platform.tenants.list"),
        ]);
        return {
          precios: exigirDatos(p),
          ajustes: exigirDatos(a),
          empresas: exigirDatos(t).length,
        };
      }}
    >
      {(d) => (
        <>
          <h2 className="t-title mb-3 text-fg md:hidden">Ajustes de plataforma</h2>
          <AjustesPlataforma precios={d.precios} ajustes={d.ajustes} empresas={d.empresas} />
        </>
      )}
    </PaginaPortal>
  );
}
