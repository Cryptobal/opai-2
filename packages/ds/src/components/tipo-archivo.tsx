import { FileText, Image as Imagen } from "lucide-react";

/**
 * Icono por tipo de archivo (PDF, imagen u otro): caja de 36 px. En su propio módulo para que una
 * lista de solo lectura (p. ej. la ficha de documentos) lo use sin arrastrar el uploader (ADR-037).
 */
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
