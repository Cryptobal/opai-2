import { HojaSubir, VistaPrevia } from "@/app/_components/documentos/diferidas";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { PestanasDocumentos } from "./_componentes/pestanas-documentos";
import { cargarExplorador } from "./_componentes/datos";
import { etiquetasEntidad } from "./_componentes/etiquetas";
import { ListaDocumentos } from "./_componentes/lista-documentos";

export const metadata = { title: "Documentos" };

/**
 * Explorador de Documentos (CAR-182 · PR 4, diseño v4 · 01): todos los documentos del tenant en una
 * tabla con búsqueda, filtros y paginación por cursor. La fila abre la vista previa (`?ver=`); subir
 * (`?subir=1`) permite elegir a qué se vincula: la empresa (por defecto), una cuenta, una instalación
 * o una persona.
 */
export default function Documentos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Documentos"
      ruta="/documentos"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return { ...(await cargarExplorador(p)), p };
      }}
    >
      {(d) => (
        <>
          <PestanasDocumentos activa="explorador" />
          <ListaDocumentos
            state={d.state}
            items={d.items}
            siguiente={d.siguiente}
            total={d.total}
            tipos={d.tipos}
            puedeSubir={d.puedeSubir}
            voc={d.voc}
            p={d.p}
          />
          <VistaPrevia />
          {d.puedeSubir ? (
            <HojaSubir
              entidad={{ tipo: "tenant", id: d.tenantId }}
              tipos={d.tipos}
              vincular={{
                tenantId: d.tenantId,
                etiquetas: etiquetasEntidad(d.voc),
                disponibles: d.vinculables,
                acotada: d.acotada,
              }}
            />
          ) : null}
        </>
      )}
    </PaginaPortal>
  );
}
