import { FileText, Upload } from "lucide-react";

import { Badge, Estado, TipoArchivo, Vigencia } from "@opai/ds";

import { datosSiHayPermiso } from "@/lib/carga";
import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EnlaceBotonHoja } from "../maestros/enlace-boton-hoja";
import { HojaSubir, VistaPrevia } from "./diferidas";
import { MenuDocumento } from "./menu-documento-diferido";
import { diasHasta, type Documento, type EntidadDocumento, type TipoDocumento } from "./tipos";

const CAPA = {
  tenant: "empresa",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
  puesto: "puesto",
} as const;

/** Tab Documentos de una ficha (16): resumen de vigencias, faltantes punteados y lista por tipo. */
export async function FichaDocumentos({
  entidad,
  consulta = "",
}: {
  entidad: EntidadDocumento;
  /** Continuación de la URL de la lista (`&q=…`) para que subir un documento no pierda la búsqueda. */
  consulta?: string;
}) {
  const [r, t] = await Promise.all([
    ejecutarComoUsuario<{ items: Documento[]; faltantes: { tipoId: string; nombre: string }[] }>(
      "erp",
      "core.documentos.list",
      { entidad },
    ),
    ejecutarComoUsuario<TipoDocumento[]>("erp", "core.documento_tipos.list", {
      capa: CAPA[entidad.tipo],
    }),
  ]);
  const docs = r.ok ? r.data.items : [];
  const faltantes = r.ok ? r.data.faltantes : [];
  // Sin permiso para los tipos, la hoja de subir no ofrece ninguno; otro fallo va al error.tsx (CAR-50).
  const tipos = datosSiHayPermiso(t, []);
  const cuenta = (v: Documento["vigencia"]) => docs.filter((d) => d.vigencia === v).length;
  const grupos = [...new Set(docs.map((d) => d.tipo ?? "Sin tipo"))];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
        {/* Con la lista caída no hay conteos que mostrar: «0 vigentes» sería falso (CAR-50). */}
        {r.ok ? (
          <>
            <Badge tono="success">{cuenta("vigente")} vigentes</Badge>
            <Badge tono="warning">{cuenta("por_vencer")} por vencer</Badge>
            <Badge tono="danger">{cuenta("vencido")} vencidos</Badge>
            <Badge punto={false}>{cuenta("sin_fecha")} sin vencimiento</Badge>
          </>
        ) : null}
        {faltantes.length ? (
          <span className="text-sm text-fg-muted">
            · Falta {faltantes.length === 1 ? "1 obligatorio" : `${faltantes.length} obligatorios`}:{" "}
            {faltantes.map((f) => f.nombre).join(", ")}
          </span>
        ) : null}
        <EnlaceBotonHoja
          href={`?subir=1${consulta}`}
          icono={Upload}
          className="ml-auto max-md:w-full"
        >
          Subir documento
        </EnlaceBotonHoja>
      </div>
      <Estado
        state={r.ok && docs.length === 0 && faltantes.length === 0 ? "empty" : estadoPantalla(r)}
        variante="lista"
        textos={{
          vacio: {
            titulo: "Sin documentos",
            descripcion: "Sube contratos, certificados y acreditaciones con su vencimiento.",
            accion: <EnlaceBotonHoja href={`?subir=1${consulta}`}>Subir documento</EnlaceBotonHoja>,
          },
        }}
      >
        {grupos.map((g) => (
          <section key={g} className="flex flex-col gap-2">
            <h3 className="t-caption">{g}</h3>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface">
              {docs
                .filter((d) => (d.tipo ?? "Sin tipo") === g)
                .map((d) => (
                  <li
                    key={d.id}
                    className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                  >
                    <TipoArchivo nombre={d.nombre} mime={d.mime} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-fg">
                        {d.titulo ?? d.nombre}
                      </span>
                      <span className="block text-sm text-fg-muted sm:truncate">
                        {[
                          d.tipo,
                          d.emitidoEn ? `emitido ${fecha(d.emitidoEn)}` : null,
                          d.venceEn
                            ? `${d.vigencia === "vencido" ? "venció" : "vence"} ${fecha(d.venceEn)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <Vigencia
                        estado={d.vigencia}
                        dias={diasHasta(d.venceEn)}
                        className="mt-1 sm:hidden"
                      />
                    </span>
                    <Vigencia
                      estado={d.vigencia}
                      dias={diasHasta(d.venceEn)}
                      className="hidden sm:inline-flex"
                    />
                    <MenuDocumento documento={d} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {faltantes.map((f) => (
          <div
            key={f.tipoId}
            className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong px-4 py-3"
          >
            <span className="flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-bg text-fg-muted">
              <FileText className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-fg">Falta: {f.nombre}</span>
              <span className="t-caption block">
                Obligatorio · nunca se subió. Un documento vencido se renueva en su fila.
              </span>
            </span>
            <EnlaceBotonHoja
              href={`?subir=1&tipo=${f.tipoId}${consulta}`}
              variante="secondary"
              icono={Upload}
            >
              Subir
            </EnlaceBotonHoja>
          </div>
        ))}
      </Estado>
      <HojaSubir entidad={entidad} tipos={tipos} />
      <VistaPrevia />
    </div>
  );
}
