"use client";

import { AlertTriangle, Plus, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn } from "../cn";
import { Button } from "./button";
import { type ArchivoEnProceso, FilaArchivo } from "./uploader-fila";

export { subirConProgreso } from "./uploader-fila";

type Props = {
  /** Sube y confirma un archivo; llama `progreso(0..1)` y lanza `Error` con el motivo si falla. */
  procesar: (archivo: File, progreso: (fraccion: number) => void) => Promise<void>;
  accept?: string;
  /** "PDF, JPG o PNG". */
  tipos?: string;
  tamanoMaximoMb?: number;
  multiple?: boolean;
  /** Variante compacta (logos de Marca): solo el botón. */
  compacto?: boolean;
  disabled?: boolean;
  /** Avisa al quitar un archivo de la lista (para que quien lo usa también lo suelte). */
  onQuitar?: (archivo: File) => void;
  /** Texto del botón de teléfono; por defecto «Agregar archivo». */
  etiquetaBoton?: string;
};

let secuencia = 0;

/**
 * Carga de archivos: zona punteada en md+ ("Arrastra el archivo o elige uno"), botón `lg` en
 * teléfono (cámara, galería o archivos). Cada archivo muestra progreso real, verificación y error
 * con reintentar. La subida va directo al almacenamiento con la URL firmada (ADR-039).
 */
export function Uploader(props: Props) {
  const {
    procesar,
    accept,
    tipos,
    tamanoMaximoMb = 50,
    multiple,
    compacto,
    disabled,
    onQuitar,
    etiquetaBoton,
  } = props;
  const [archivos, setArchivos] = useState<ArchivoEnProceso[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const actualizar = (clave: number, cambio: Partial<ArchivoEnProceso>) =>
    setArchivos((l) => l.map((a) => (a.clave === clave ? { ...a, ...cambio } : a)));

  async function iniciar(a: ArchivoEnProceso) {
    if (a.archivo.size > tamanoMaximoMb * 1024 * 1024) {
      actualizar(a.clave, { estado: "error", error: `El archivo supera ${tamanoMaximoMb} MB` });
      return;
    }
    actualizar(a.clave, { estado: "subiendo", fraccion: 0, error: undefined });
    try {
      await procesar(a.archivo, (f) =>
        actualizar(a.clave, f >= 1 ? { estado: "verificando", fraccion: 1 } : { fraccion: f }),
      );
      actualizar(a.clave, { estado: "listo", fraccion: 1 });
    } catch (e) {
      actualizar(a.clave, {
        estado: "error",
        error: e instanceof Error ? e.message : "No pudimos subir el archivo",
      });
    }
  }

  function agregar(lista: FileList | null) {
    const nuevos = [...(lista ?? [])]
      .slice(0, multiple ? undefined : 1)
      .map((archivo): ArchivoEnProceso => ({
        clave: ++secuencia,
        archivo,
        estado: "subiendo",
        fraccion: 0,
      }));
    setArchivos((l) => [...(multiple ? l : []), ...nuevos]);
    for (const a of nuevos) void iniciar(a);
  }

  const ayuda = `${tipos ? `${tipos} ` : ""}hasta ${tamanoMaximoMb} MB`;
  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        {...(accept ? { accept } : {})}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = "";
        }}
      />
      <div className={cn("flex flex-col gap-1.5", !compacto && "md:hidden")}>
        <Button
          variant="secondary"
          size="lg"
          block
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <Plus className="size-5" aria-hidden /> {etiquetaBoton ?? "Agregar archivo"}
        </Button>
        <p className="t-caption text-center">Cámara, galería o archivos · {ayuda}</p>
      </div>
      {compacto ? null : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            agregar(e.dataTransfer.files);
          }}
          className={cn(
            "hidden cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-border-strong bg-surface p-5 text-center transition-colors md:flex",
            arrastrando && "border-accent bg-accent-muted",
            disabled && "pointer-events-none opacity-45",
          )}
        >
          <Upload
            className={cn("size-5 text-fg-muted", arrastrando && "text-accent")}
            aria-hidden
          />
          <span className="text-base text-fg">
            {arrastrando ? (
              "Suelta para subir"
            ) : (
              <>
                Arrastra el archivo o{" "}
                <span className="font-medium text-accent underline">elige uno</span>
              </>
            )}
          </span>
          <span className="t-caption">{ayuda}</span>
        </label>
      )}
      {archivos.map((a) => (
        <FilaArchivo
          key={a.clave}
          a={a}
          onQuitar={() => {
            setArchivos((l) => l.filter((x) => x.clave !== a.clave));
            onQuitar?.(a.archivo);
          }}
          onReintentar={() => void iniciar(a)}
        />
      ))}
      {archivos.some((a) => a.estado === "error") ? (
        <span className="sr-only" role="alert">
          <AlertTriangle aria-hidden /> Hay archivos con error
        </span>
      ) : null}
    </div>
  );
}
