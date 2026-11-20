import { notFound } from "next/navigation";

import { ambitoDeClase, type ClasePlantilla } from "@opai/domain";
import { ErrorState, Forbidden } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PestanasDocumentos } from "../../../_componentes/pestanas-documentos";
import { PantallaEnvioMasivo } from "./_componentes/pantalla-envio-masivo";

export const metadata = { title: "Envío masivo" };
type Props = { params: Promise<{ id: string }> };

type Plantilla = { id: string; nombre: string; clase: ClasePlantilla };
type Instalacion = { id: string; nombre: string };
type Cargo = { id: string; nombre: string };

/**
 * Envío masivo de documentos laborales desde una plantilla (CAR-633, diseño 07 · lote B3).
 */
export default function EnvioMasivoPlantilla({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Documentos"
      ruta="/documentos/plantillas"
      cargando="detalle"
      cargar={async () => {
        const { id } = await params;
        const [plantilla, instalaciones, cargos] = await Promise.all([
          ejecutarComoUsuario<Plantilla>("erp", "core.documento_plantillas.get", { id }),
          ejecutarComoUsuario<{ items: Instalacion[] }>("erp", "core.instalaciones.list", { limite: 200 }),
          ejecutarComoUsuario<{ cargos?: Cargo[] }>("erp", "core.personas.list", {
            limite: 1,
            incluirFiltros: true,
          }),
        ]);
        return { id, plantilla, instalaciones, cargos };
      }}
      opciones={(d) => ({
        titulo: "Envío masivo",
        volver: { href: `/documentos/plantillas/${d.id}`, etiqueta: "Plantilla" },
      })}
    >
      {(d) => {
        if (!d.plantilla.ok) {
          if (estadoPantalla(d.plantilla) === "forbidden")
            return (
              <Forbidden
                titulo="No puedes enviar documentos en lote"
                descripcion="Solo owner y admin gestionan plantillas y envíos masivos."
              />
            );
          if (d.plantilla.error.code === "NOT_FOUND") notFound();
          return <ErrorState titulo="No pudimos abrir la plantilla" descripcion={d.plantilla.error.message} />;
        }
        if (ambitoDeClase(d.plantilla.data.clase) !== "persona") notFound();
        const inst = d.instalaciones.ok ? d.instalaciones.data.items : [];
        const cargos = d.cargos.ok && d.cargos.data.cargos ? d.cargos.data.cargos : [];
        return (
          <>
            <PestanasDocumentos activa="plantillas" />
            <PantallaEnvioMasivo
              plantillaId={d.plantilla.data.id}
              plantillaNombre={d.plantilla.data.nombre}
              instalaciones={inst}
              cargos={cargos}
            />
          </>
        );
      }}
    </PaginaPortal>
  );
}