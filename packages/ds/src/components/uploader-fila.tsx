"use client";

import { AlertTriangle, FileText, Image as Imagen, X } from "lucide-react";

import { cn } from "../cn";
import { Button } from "./button";

export type ArchivoEnProceso = {
  clave: number;
  archivo: File;
  estado: "subiendo" | "verificando" | "listo" | "error";
  fraccion: number;
  error?: string | undefined;
};

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/** Icono por tipo de archivo (PDF, imagen u otro): caja de 36 px. */
export function TipoArchivo({ nombre, mime }: { nombre: string; mime?: string }) {
  const imagen = mime?.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(nombre);
  const pdf = mime === "application/pdf" || /\.pdf$/i.test(nombre);
  return (
    <span
      aria-hidden
      className="inline-flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-bg text-[10px] font-semibold text-fg-muted"
    >
      {pdf ? "PDF" : imagen ? <Imagen className="size-4" /> : <FileText className="size-4" />}
    </span>
  );
}

export function FilaArchivo(props: {
  a: ArchivoEnProceso;
  onQuitar: () => void;
  onReintentar: () => void;
}) {
  const { a } = props;
  const error = a.estado === "error";
  const linea =
    a.estado === "subiendo"
      ? `Subiendo · ${mb(a.archivo.size * a.fraccion)} de ${mb(a.archivo.size)}`
      : a.estado === "verificando"
        ? "Comprobando integridad…"
        : a.estado === "listo"
          ? `Listo · ${mb(a.archivo.size)}`
          : (a.error ?? "No pudimos subir el archivo");
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-surface p-3",
        error ? "border-danger-fg" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        {error ? (
          <span className="inline-flex size-9 flex-none items-center justify-center rounded-sm border border-border bg-bg text-danger-fg">
            <AlertTriangle className="size-4" aria-hidden />
          </span>
        ) : (
          <TipoArchivo nombre={a.archivo.name} mime={a.archivo.type} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-fg">{a.archivo.name}</span>
          <span
            className={cn(
              "block truncate text-xs",
              error ? "font-medium text-danger-fg" : "text-fg-muted",
            )}
            {...(error ? { role: "alert" } : { "aria-live": "polite" })}
          >
            {linea}
          </span>
        </span>
        {error ? (
          <Button variant="ghost" onClick={props.onReintentar}>
            Reintentar
          </Button>
        ) : a.estado !== "verificando" ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Quitar ${a.archivo.name}`}
            onClick={props.onQuitar}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
      {a.estado === "subiendo" || a.estado === "verificando" ? (
        <span className="block h-0.5 overflow-hidden rounded-full bg-fill">
          <span
            className="block h-full bg-accent transition-[width] duration-150"
            style={{ width: `${Math.round(a.fraccion * 100)}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

/** PUT directo a la URL firmada con progreso real (XMLHttpRequest expone `upload.onprogress`). */
export function subirConProgreso(
  url: string,
  archivo: Blob,
  cabeceras: Record<string, string>,
  onProgreso: (fraccion: number) => void,
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(cabeceras)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && onProgreso(Math.min(0.99, e.loaded / e.total));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolver()
        : rechazar(new Error(`El almacenamiento rechazó el archivo (${xhr.status})`));
    xhr.onerror = () => rechazar(new Error("Se cortó la conexión. Reintenta."));
    xhr.send(archivo);
  });
}
