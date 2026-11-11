import { notFound } from "next/navigation";

import { Empty, ErrorState, Forbidden } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { SelectorPlantilla } from "./_componentes/selector-plantilla";
import type { PlantillaOpcion, VistaRelleno } from "./_componentes/tipos";
import { VistaDocumento } from "./_componentes/vista-documento";

export const metadata = { title: "Generar documento" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/**
 * 07 · Generar documento (CAR-127, PR 4a): elige una plantilla laboral y ve el documento con los datos de
 * la persona, con lo que falta señalado. La generación del PDF y la firma llegan en el PR 4b. Solo owner
 * y admin (`documentos.plantillas.manage`); el permiso, el alcance y la lectura sensible del sueldo los
 * verifica la capacidad `core.documento_plantillas.rellenar`.
 */
export default function GenerarDocumentoPagina({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Generar documento"
      ruta="/personas"
      cargando="detalle"
      cargar={async () => {
        const { id } = await params;
        const sp = await searchParams;
        const plantilla = typeof sp["plantilla"] === "string" ? sp["plantilla"] : "";
        const lista = await ejecutarComoUsuario<PlantillaOpcion[]>("erp", "core.documento_plantillas.list", {});
        const vista =
          lista.ok && plantilla
            ? await ejecutarComoUsuario<VistaRelleno>("erp", "core.documento_plantillas.rellenar", { plantillaId: plantilla, personaId: id })
            : null;
        return { id, plantilla, lista, vista };
      }}
      opciones={(d) => ({
        titulo: "Generar documento",
        volver: { href: `/personas/${d.id}/documentos`, etiqueta: "Documentos" },
      })}
    >
      {({ id, plantilla, lista, vista }) => {
        if (!lista.ok) {
          if (estadoPantalla(lista) === "forbidden")
            return (
              <Forbidden
                titulo="No puedes generar documentos laborales"
                descripcion="Solo owner y admin generan documentos. Pídele acceso a un administrador."
              />
            );
          return <ErrorState titulo="No pudimos preparar el documento" descripcion="Revisa tu conexión. Si el problema sigue, avísale a soporte con el código DOC-GEN-500." />;
        }
        if (lista.data.length === 0)
          return <Empty titulo="Aún no hay plantillas laborales" descripcion="Crea una en Documentos → Plantillas y vuelve aquí." />;
        if (vista && !vista.ok && vista.error.code === "NOT_FOUND") notFound();
        return (
          <div className="flex flex-col gap-6">
            <div className="max-w-md">
              <SelectorPlantilla
                actual={plantilla}
                opciones={lista.data.map((p) => ({ valor: p.id, etiqueta: `${p.nombre} · ${p.tipo}` }))}
              />
            </div>
            {vista?.ok ? (
              <VistaDocumento vista={vista.data} fichaHref={`/personas/${id}`} />
            ) : vista ? (
              <ErrorState titulo="No pudimos preparar el documento" descripcion={vista.error.message} />
            ) : (
              <Empty titulo="Elige una plantilla" descripcion="Verás el documento con los datos de la persona antes de generarlo." />
            )}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
