type ArchivoDeclarado = { tamano: number; mime: string; sha256: string | null };
type ObjetoSubido = { tamano: number; mime?: string | null; sha256?: string | null };

/** Verifica tamaño, formato y huella, en ese orden; sin acceso al almacenamiento. */
export function motivoSubidaInvalida(d: ArchivoDeclarado, objeto: ObjetoSubido | null): string | null {
  if (!objeto)
    return "El archivo todavía no llega al almacenamiento: súbelo con la URL firmada.";
  if (objeto.tamano !== d.tamano)
    return `El archivo pesa ${objeto.tamano} bytes y se declararon ${d.tamano}.`;
  if (objeto.mime && objeto.mime !== d.mime)
    return `El archivo llegó como ${objeto.mime} y se declaró ${d.mime}.`;
  if (!objeto.sha256 || objeto.sha256 !== d.sha256)
    return "La huella SHA-256 del archivo no coincide con la declarada.";
  return null;
}
