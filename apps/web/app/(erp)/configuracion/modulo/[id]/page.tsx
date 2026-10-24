import { notFound } from "next/navigation";

import { listarModulos } from "@opai/capabilities";
import { Alerta, Empty } from "@opai/ds";

import { AjustesConectados } from "../../_centro/ajustes-conectados";
import { cargarAjustes } from "../../_centro/ajustes-datos";
import { PaginaConfig } from "../../_centro/pagina-config";

export const metadata = { title: "Ajustes del módulo" };

type Props = { params: Promise<{ id: string }> };

/** Ajustes de un módulo activo (36), renderizados desde su esquema (ADR-018). */
export default function AjustesModulo({ params }: Props) {
  return (
    <PaginaConfig
      seccion={(d) => `modulo-${d.id}`}
      titulo={(d) => d.manifest?.nombre ?? "Ajustes del módulo"}
      cargar={async () => {
        const { id } = await params;
        const manifest = listarModulos().find((m) => m.id === id) ?? null;
        if (!manifest) notFound();
        return { id, manifest, ajustes: await cargarAjustes(id) };
      }}
      cabecera={(d) => ({
        subtitulo: d.manifest ? `Módulo activo · versión ${d.manifest.version}` : d.id,
      })}
    >
      {({ manifest, ajustes }) =>
        !manifest ? (
          <Alerta tono="danger" titulo="Este módulo no existe" />
        ) : ajustes.campos.length === 0 ? (
          <Empty titulo="Sin ajustes" descripcion="Este módulo no tiene ajustes configurables." />
        ) : (
          <AjustesConectados campos={ajustes.campos} valores={ajustes.valores} />
        )
      }
    </PaginaConfig>
  );
}
