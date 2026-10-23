import { FileText, Upload } from "lucide-react";

import { Badge, Estado, TipoArchivo, Vigencia } from "@opai/ds";

import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EnlaceBoton } from "../maestros/enlace-boton";
import { HojaSubir } from "./hoja-subir";
import { MenuDocumento } from "./menu-documento";
import { diasHasta, type Documento, type EntidadDocumento, type TipoDocumento } from "./tipos";
import { VistaPrevia } from "./vista-previa";

const CAPA = {
  tenant: "empresa",
  cuenta: "cuenta",
  instalacion: "instalacion",
  persona: "persona",
  puesto: "puesto",
} as const;

/** Tab Documentos de una ficha (16): resumen de vigencias, faltantes punteados y lista por tipo. */
export async function FichaDocumentos({ entidad }: { entidad: EntidadDocumento }) {
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
  const tipos = t.ok ? t.data : [];
  const cuenta = (v: Documento["vigencia"]) => docs.filter((d) => d.vigencia === v).length;
  const grupos = [...new Set(docs.map((d) => d.tipo ?? "Sin tipo"))];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
        <Badge tono="success">{cuenta("vigente")} vigentes</Badge>
        <Badge tono="warning">{cuenta("por_vencer")} por vencer</Badge>
        <Badge tono="danger">{cuenta("vencido")} vencidos</Badge>
        <Badge punto={false}>{cuenta("sin_fecha")} sin vencimiento</Badge>
        {faltantes.length ? (
          <span className="text-sm text-fg-muted">
            · Falta {faltantes.length === 1 ? "1 obligatorio" : `${faltantes.length} obligatorios`}:{" "}
            {faltantes.map((f) => f.nombre).join(", ")}
          </span>
        ) : null}
        <EnlaceBoton href="?subir=1" icono={Upload} className="ml-auto max-md:w-full">
          Subir documento
        </EnlaceBoton>
      </div>
      <Estado
        state={r.ok && docs.length === 0 && faltantes.length === 0 ? "empty" : estadoPantalla(r)}
        variante="lista"
        textos={{
          vacio: {
            titulo: "Sin documentos",
            descripcion: "Sube contratos, certificados y acreditaciones con su vencimiento.",
            accion: <EnlaceBoton href="?subir=1">Subir documento</EnlaceBoton>,
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
                      <span className="block truncate text-sm text-fg-muted">
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
            <EnlaceBoton href={`?subir=1&tipo=${f.tipoId}`} variante="secondary" icono={Upload}>
              Subir
            </EnlaceBoton>
          </div>
        ))}
      </Estado>
      <HojaSubir entidad={entidad} tipos={tipos} />
      <VistaPrevia />
    </div>
  );
}
