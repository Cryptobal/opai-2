import { notFound } from "next/navigation";

import { listarModulos } from "@opai/capabilities";
import { Alerta, Empty, Tabs } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { construirPuede } from "@/lib/permisos-ui";

import { AjustesConectados } from "../../_centro/ajustes-conectados";
import { cargarAjustes } from "../../_centro/ajustes-datos";
import { PaginaConfig } from "../../_centro/pagina-config";
import { seccionesDe } from "../../_centro/secciones-modulos";

export const metadata = { title: "Ajustes del módulo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/**
 * Configuración de un módulo activo (36): los ajustes de su esquema (ADR-018) y, si el módulo las
 * registra en `secciones-modulos.ts`, sus pestañas (Comercial: Embudo y Catálogos) por la URL.
 */
export default function AjustesModulo({ params, searchParams }: Props) {
  return (
    <PaginaConfig
      seccion={(d) => `modulo-${d.id}`}
      titulo={(d) => d.manifest?.nombre ?? "Ajustes del módulo"}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const manifest = listarModulos().find((m) => m.id === id) ?? null;
        if (!manifest) notFound();
        return { id, manifest, pedida: p["seccion"], ajustes: await cargarAjustes(id) };
      }}
      cabecera={(d) => ({
        subtitulo: d.manifest ? `Módulo activo · versión ${d.manifest.version}` : d.id,
      })}
    >
      {({ id, manifest, pedida, ajustes }, indice) => {
        if (!manifest) return <Alerta tono="danger" titulo="Este módulo no existe" />;
        const { visibles, activa } = seccionesDe(
          id,
          construirPuede(indice.rol, indice.acceso),
          pedida,
        );
        const contenido = activa ? (
          <activa.Contenido />
        ) : ajustes.campos.length === 0 ? (
          <Empty titulo="Sin ajustes" descripcion="Este módulo no tiene ajustes configurables." />
        ) : (
          <AjustesConectados campos={ajustes.campos} valores={ajustes.valores} />
        );
        if (!visibles.length) return contenido;
        const base = `/configuracion/modulo/${id}`;
        return (
          <Tabs
            activa={activa?.id ?? "ajustes"}
            Link={LinkNext}
            tabs={[
              ...visibles.map((s) => ({
                id: s.id,
                etiqueta: s.etiqueta,
                href: `${base}?seccion=${s.id}`,
              })),
              { id: "ajustes", etiqueta: "Ajustes", href: `${base}?seccion=ajustes` },
            ]}
          >
            {contenido}
          </Tabs>
        );
      }}
    </PaginaConfig>
  );
}
