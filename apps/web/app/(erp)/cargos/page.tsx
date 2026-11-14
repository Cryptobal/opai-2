import { Briefcase } from "lucide-react";

import { SplitScreen } from "@opai/ds";
import { PERMISOS_CORE } from "@opai/domain";

import { EncabezadoGrupo } from "@/app/(erp)/configuracion/_centro/encabezado-grupo";
import { GRUPO_CARGOS, VOLVER_CARGOS } from "@/app/(erp)/configuracion/_centro/grupo-cargos";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarCargosLista } from "./_componentes/datos";
import { HojaCargo } from "./_componentes/diferidas";
import { ListaCargos } from "./_componentes/lista-cargos";

export const metadata = { title: "Cargos" };

/**
 * Cargos (14): vista dividida con «Elige un cargo»; lista en teléfono. Es un catálogo de
 * Configuración › Operación (CAR-182): conserva las migas y el «atrás» del grupo (CAR-319).
 */
export default function Cargos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Configuración"
      ruta="/cargos"
      completo
      volverSoloTelefono
      volver={VOLVER_CARGOS}
      cargar={async () => {
        const [p, identidad] = await Promise.all([
          leerParametros(searchParams),
          requerirIdentidad("/cargos"),
        ]);
        return {
          ...(await cargarCargosLista(p)),
          q: p.q,
          puedeGestionar: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasManage),
          puedeVerSensible: puedeDeIdentidad(identidad)(PERMISOS_CORE.estructurasReadSensible),
        };
      }}
    >
      {(d) => (
        <>
          {GRUPO_CARGOS ? <EncabezadoGrupo grupo={GRUPO_CARGOS} entrada /> : null}
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de cargos"
            vacio={{ texto: "Elige un cargo", icono: Briefcase }}
            lista={
              <ListaCargos
                state={d.state}
                items={d.items}
                {...(d.q ? { q: d.q } : {})}
                puedeGestionar={d.puedeGestionar}
              />
            }
          />
          {d.puedeGestionar ? <HojaCargo puedeVerSensible={d.puedeVerSensible} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
