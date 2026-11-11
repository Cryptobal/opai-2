import { notFound } from "next/navigation";

import { ErrorState, Forbidden } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorPlantilla } from "./_componentes/editor";
import type { PlantillaEditor } from "./_componentes/tipos";

export const metadata = { title: "Editor de plantilla" };
type Props = { params: Promise<{ id: string }> };

/**
 * 06 · Editor de plantillas (CAR-127, PR 3). Carlos escribe aquí el texto de contratos, anexos y
 * cartas: se guarda como borrador y al publicarlo pasa a ser la versión siguiente. Solo owner y admin
 * (`documentos.plantillas.manage`); el permiso y el tenant los verifica la capacidad.
 */
export default function EditorPlantillaPagina({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Plantilla"
      ruta="/documentos/plantillas"
      volver={{ href: "/documentos/plantillas", etiqueta: "Plantillas" }}
      cargando="detalle"
      cargar={async () => {
        const { id } = await params;
        return ejecutarComoUsuario<PlantillaEditor>("erp", "core.documento_plantillas.get", { id });
      }}
      opciones={(r) => ({ titulo: r.ok ? r.data.nombre : "Plantilla" })}
    >
      {(r) => {
        if (r.ok) return <EditorPlantilla key={r.data.id} inicial={r.data} />;
        if (estadoPantalla(r) === "forbidden")
          return (
            <Forbidden
              titulo="No puedes editar plantillas"
              descripcion="Solo owner y admin editan plantillas. Pídele acceso a un administrador."
            />
          );
        if (r.error.code === "NOT_FOUND") notFound();
        return (
          <ErrorState
            titulo="No pudimos abrir la plantilla"
            descripcion="Tu borrador guardado sigue ahí. Revisa tu conexión y vuelve a intentarlo; si sigue, avísale a soporte con el código DOC-EDI-500."
          />
        );
      }}
    </PaginaPortal>
  );
}
