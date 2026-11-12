import { notFound } from "next/navigation";

import { AMBITO_DE_CLASE, type ClasePlantilla } from "@opai/domain";
import { Empty, ErrorState, Forbidden } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { SelectorPlantillaEntidad } from "./selector-plantilla-entidad";
import type { PlantillaEntidad, TipoEntidad, VistaRellenoEntidad } from "./tipos";
import { VistaEntidad } from "./vista-entidad";

const RUTA = { cuenta: "/cuentas", instalacion: "/instalaciones" } as const;
const VOLVER = { cuenta: "Documentos de la cuenta", instalacion: "Documentos de la instalación" } as const;

type Props = { tipo: TipoEntidad; params: Promise<{ id: string }>; searchParams: SearchParams };

/**
 * Generar documento sobre una cuenta (contrato de servicio) o una instalación (acta), CAR-315 parte 2.
 * Elige entre las plantillas de ese ámbito y ve el documento con los datos de la entidad antes de generarlo.
 * Permiso, alcance y ámbito los verifica `core.documento_plantillas.rellenar_entidad`.
 */
export function PaginaGenerarEntidad({ tipo, params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Generar documento"
      ruta={RUTA[tipo]}
      cargando="detalle"
      cargar={async () => {
        const { id } = await params;
        const sp = await searchParams;
        const plantilla = typeof sp["plantilla"] === "string" ? sp["plantilla"] : "";
        const lista = await ejecutarComoUsuario<PlantillaEntidad[]>("erp", "core.documento_plantillas.list", {});
        const vista =
          lista.ok && plantilla
            ? await ejecutarComoUsuario<VistaRellenoEntidad>("erp", "core.documento_plantillas.rellenar_entidad", { plantillaId: plantilla, entidadId: id })
            : null;
        return { id, plantilla, lista, vista };
      }}
      opciones={(d) => ({
        titulo: "Generar documento",
        volver: { href: `${RUTA[tipo]}/${d.id}/documentos`, etiqueta: VOLVER[tipo] },
      })}
    >
      {({ id, plantilla, lista, vista }) => {
        if (!lista.ok) {
          if (estadoPantalla(lista) === "forbidden")
            return <Forbidden titulo="No puedes generar documentos" descripcion="Solo owner y admin generan documentos. Pídele acceso a un administrador." />;
          return <ErrorState titulo="No pudimos preparar el documento" descripcion="Revisa tu conexión. Si el problema sigue, avísale a soporte con el código DOC-GEN-500." />;
        }
        const opciones = lista.data.filter((p) => p.activa && AMBITO_DE_CLASE[p.clase as ClasePlantilla] === tipo);
        if (opciones.length === 0)
          return (
            <Empty
              titulo={tipo === "cuenta" ? "Aún no hay plantillas de contrato de servicio" : "Aún no hay plantillas de acta"}
              descripcion="Crea una en Documentos → Plantillas y vuelve aquí."
            />
          );
        if (vista && !vista.ok && vista.error.code === "NOT_FOUND") notFound();
        return (
          <div className="flex flex-col gap-6">
            <h2 className="t-title text-fg md:hidden">Generar documento</h2>
            <div className="max-w-md">
              <SelectorPlantillaEntidad actual={plantilla} opciones={opciones.map((p) => ({ valor: p.id, etiqueta: `${p.nombre} · ${p.tipo}` }))} />
            </div>
            {vista?.ok ? (
              <VistaEntidad vista={vista.data} fichaHref={`${RUTA[tipo]}/${id}`} documentosHref={`${RUTA[tipo]}/${id}/documentos`} />
            ) : vista ? (
              <ErrorState titulo="No pudimos preparar el documento" descripcion={vista.error.message} />
            ) : (
              <Empty titulo="Elige una plantilla" descripcion="Verás el documento con los datos antes de generarlo." />
            )}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
