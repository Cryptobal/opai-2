/** Lee el archivo CAF como texto UTF-8 (nunca se muestra ni se persiste en el cliente). */
export function leerCafXml(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(archivo);
  });
}
