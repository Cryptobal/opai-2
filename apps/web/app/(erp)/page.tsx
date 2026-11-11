import { PaginaPortal } from "@/app/_components/pagina-portal";
import { marcoDeLaPeticion } from "@/lib/marco-servidor";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";

import { InicioErp } from "./_componentes/inicio";

/** Inicio del ERP (46/47). */
export default function Inicio({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inicio"
      ruta="/"
      cargar={async () => {
        const [p, id] = await Promise.all([leerParametros(searchParams), requerirIdentidad("/")]);
        // La misma regla que el layout: Inicio nunca se arma para un marco distinto del que se monta.
        const conEmpresa = tieneAccesoAPortal(id, "erp") && Boolean(id.actual);
        return {
          actor: p["actor"],
          nombre: id.usuario.nombre,
          empresa: id.actual?.tenant.nombre ?? "",
          hilo: (await marcoDeLaPeticion("erp", conEmpresa)) === "hilo",
        };
      }}
    >
      {(d) => <InicioErp nombre={d.nombre} empresa={d.empresa} actor={d.actor} hilo={d.hilo} />}
    </PaginaPortal>
  );
}
