import { notFound } from "next/navigation";

import { Forbidden, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarIndice } from "../../_centro/datos";
import { grupoPorId } from "../../_centro/grupos";
import { ListaGrupo } from "../../_centro/lista-grupo";
import { NotaModulos } from "../../_centro/nota-modulos";

export const metadata = { title: "Configuración" };

type Props = { params: Promise<{ id: string }> };

/**
 * Lista de un grupo del centro de Configuración (brief §4.2). En teléfono es la pantalla principal del
 * grupo (la tarjeta de la portada lleva aquí); en iPad/escritorio la tarjeta va directo a la primera
 * entrada, y aquí se ve la lista con un vacío discreto a la derecha. Un id de grupo inexistente da el
 * 404 del ERP con su shell (proxy + `notFound`); un grupo sin entradas visibles da «Sin permiso».
 */
export default async function GrupoConfig({ params }: Props) {
  const { id } = await params;
  const grupo = grupoPorId(id);
  if (!grupo) notFound();
  return (
    <PaginaPortal
      portal="erp"
      titulo={grupo.etiqueta}
      ruta={`/configuracion/grupo/${grupo.id}`}
      completo
      volver={{ href: "/configuracion", etiqueta: "Configuración" }}
      volverSoloTelefono
      cargar={cargarIndice}
    >
      {(indice) => {
        const entradas = indice.secciones.filter((s) => s.grupo === grupo.id);
        if (entradas.length === 0) {
          return (
            <Forbidden descripcion="No tienes acceso a ningún ajuste de este grupo. Pide acceso al administrador de tu empresa." />
          );
        }
        return (
          <SplitScreen
            telefono="lista"
            etiquetaLista={`Entradas de ${grupo.etiqueta}`}
            vacio={{ texto: `Elige un ajuste de ${grupo.etiqueta}`, icono: grupo.icono }}
            lista={
              <>
                <h2 className="t-title mb-3 text-fg md:hidden">{grupo.etiqueta}</h2>
                <ListaGrupo
                  etiqueta={grupo.etiqueta}
                  entradas={entradas}
                  aprobaciones={indice.aprobaciones}
                />
                {grupo.id === "modulos" ? <NotaModulos entradas={entradas} /> : null}
              </>
            }
          />
        );
      }}
    </PaginaPortal>
  );
}
