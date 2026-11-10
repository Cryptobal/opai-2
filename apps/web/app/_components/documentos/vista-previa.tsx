"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Cerrar, Dialog, Skeleton, TipoArchivo, Vigencia } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { fecha } from "@/lib/fechas";

import { useHojaUrl } from "../maestros/use-url";
import { descargar, MenuDocumento } from "./menu-documento";
import { diasHasta, type Documento } from "./tipos";
import { modoVista } from "./vista-modo";

type Detalle = Documento & { versiones: Documento[] };

/** URL firmada de corta duración en otro origen: next/image no aplica. */
const imagenFirmada = (src: string, alt: string) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} className="max-h-[70dvh] max-w-full rounded-md object-contain" />
);

/**
 * Vista previa (18): PDF o imagen, con datos, vigencia y huella verificada. El PDF no usa
 * `sandbox=""`: con el sandbox vacío Chrome no pinta el visor y la hoja queda en blanco, aunque la
 * misma URL sí descarga. El archivo vive en R2, otro origen, y `frame-src` ya lo limita.
 */
export function VistaPrevia() {
  const hoja = useHojaUrl("ver");
  const [doc, setDoc] = useState<Detalle | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!hoja.valor) return;
    let vigente = true;
    void Promise.all([
      ejecutarCapacidad("erp", "core.documentos.get", { id: hoja.valor }),
      ejecutarCapacidad("erp", "core.documentos.url_descarga", { id: hoja.valor }),
    ]).then(([g, u]) => {
      if (!vigente) return;
      setDoc(g.ok ? (g.data as Detalle) : null);
      setUrl(u.ok ? (u.data as { url: string }).url : null);
    });
    return () => {
      vigente = false;
      setDoc(null);
      setUrl(null);
    };
  }, [hoja.valor]);
  const modo = doc ? modoVista(doc) : null;
  return (
    <Dialog
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={doc?.nombre ?? "Documento"}
      tamano="grande"
      barra={
        <header className="flex items-center gap-3 border-b border-border py-2 pr-2 pl-4">
          {doc ? <TipoArchivo nombre={doc.nombre} mime={doc.mime} /> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-md font-semibold text-fg">
              {doc?.titulo ?? doc?.nombre ?? "Cargando…"}
            </p>
            <p className="t-caption truncate">
              {[doc?.tipo, doc?.emitidoEn ? `emitida ${fecha(doc.emitidoEn)}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {doc ? (
            <Vigencia
              estado={doc.vigencia}
              dias={diasHasta(doc.venceEn)}
              className="hidden md:inline-flex"
            />
          ) : null}
          {doc ? <MenuDocumento documento={doc} /> : null}
          {doc ? (
            <Button variant="secondary" onClick={() => void descargar(doc.id)}>
              <Download className="size-4" aria-hidden /> Descargar
            </Button>
          ) : null}
          <Cerrar />
        </header>
      }
    >
      <div className="flex min-h-[60dvh] flex-1 items-center justify-center bg-fill p-4">
        {!doc || !url ? (
          <Skeleton className="h-[60dvh] w-full max-w-[640px]" />
        ) : modo === "imagen" ? (
          imagenFirmada(url, doc.nombre)
        ) : modo === "pdf" ? (
          <iframe
            title={doc.nombre}
            src={url}
            className="h-[70dvh] w-full max-w-[860px] rounded-md border border-border bg-surface"
          />
        ) : (
          <div className="flex max-w-md flex-col items-center gap-3 px-4 text-center">
            <p className="text-base text-fg">Este formato no se muestra en el navegador.</p>
            <Button variant="secondary" onClick={() => void descargar(doc.id)}>
              <Download className="size-4" aria-hidden /> Descargar
            </Button>
          </div>
        )}
      </div>
      {doc ? (
        <footer className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-fg-muted">
          <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
          Versión {doc.version} · subido el {fecha(doc.creadoEn)} ·{" "}
          {doc.sha256 ? "SHA-256 verificado" : "sin huella"}
        </footer>
      ) : null}
    </Dialog>
  );
}
