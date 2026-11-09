import { PERMISOS_CORE } from "@opai/domain";
import { ListScreen } from "@opai/ds";

import { HojaSubir } from "@/app/_components/documentos/diferidas";
import type { TipoDocumento } from "@/app/_components/documentos/tipos";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { LinkNext } from "@/app/_components/link-next";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { PestanasDocumentos } from "../_componentes/pestanas-documentos";
import { cargarVencimientos } from "./_componentes/datos";
import { GrupoVencimientos } from "./_componentes/lista-vencimientos";

export const metadata = { title: "Vencimientos" };

/**
 * Vencimientos de cuentas e instalaciones (Documentos v4 · 04): lo vencido y lo que vence en 30 y 60
 * días (B2), con «Subir renovación» que abre la hoja de subir sobre el documento que se reemplaza.
 * El alcance (supervisor: sus instalaciones) y los sensibles los aplica la capacidad en la consulta.
 */
export default function Vencimientos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Documentos"
      ruta="/documentos/vencimientos"
      completo
      cargar={async () => {
        const [datos, identidad, p] = await Promise.all([
          cargarVencimientos(),
          requerirIdentidad("/documentos/vencimientos"),
          leerParametros(searchParams),
        ]);
        const puedeSubir = puedeDeIdentidad(identidad)(PERMISOS_CORE.documentosManage);
        // La hoja de renovar sube a la entidad del documento que se reemplaza, con los tipos de su capa.
        const reemplaza = p["reemplaza"];
        const doc = puedeSubir
          ? datos.grupos.flatMap((g) => g.items).find((d) => d.id === reemplaza)
          : undefined;
        const tipoEntidad =
          doc?.entidad?.tipo === "cuenta" || doc?.entidad?.tipo === "instalacion"
            ? doc.entidad.tipo
            : null;
        const entidad =
          doc?.entidad && tipoEntidad
            ? {
                tipo: tipoEntidad === "cuenta" ? ("cuenta" as const) : ("instalacion" as const),
                id: doc.entidad.id,
              }
            : null;
        const t = entidad
          ? await ejecutarComoUsuario<TipoDocumento[]>("erp", "core.documento_tipos.list", {
              capa: entidad.tipo,
            })
          : null;
        return { ...datos, puedeSubir, entidad, tipos: t?.ok ? t.data : [] };
      }}
    >
      {(d) => (
        <>
          <PestanasDocumentos activa="vencimientos" />
          {d.state !== "ready" || d.grupos.length === 0 ? (
            <ListScreen<never>
              state={d.state}
              titulo="Vencimientos"
              soloTelefono
              items={[]}
              clave={() => ""}
              tarjeta={() => null}
              columnas={[]}
              textos={{
                vacio: {
                  titulo: "Nada por vencer",
                  descripcion:
                    "Ningún documento de cuentas o instalaciones vence en los próximos 60 días.",
                  accion: (
                    <LinkNext href="/documentos" className="text-accent hover:underline">
                      Ver explorador
                    </LinkNext>
                  ),
                },
              }}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {d.grupos.map((g) => (
                <GrupoVencimientos key={g.id} grupo={g} puedeSubir={d.puedeSubir} />
              ))}
            </div>
          )}
          {d.entidad ? <HojaSubir entidad={d.entidad} tipos={d.tipos} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
