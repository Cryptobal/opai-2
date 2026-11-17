import { Table, Td, Th } from "@opai/ds";

export type ArchivoLegal = {
  nombre: string;
  contenido: string;
  filas: number;
  errores: { personaId: string | null; personaNombre: string | null; mensaje: string }[];
  advertencias: string[];
};

const ETIQUETA: Record<string, string> = { lre: "LRE", previred: "archivo de Previred", f30_1: "certificado F30-1" };

/** Resultado de validar un archivo legal: conteo, tabla de errores por persona y avisos de formato. */
export function ResultadoArchivo({
  archivo,
  tipo,
}: {
  archivo: ArchivoLegal;
  tipo: "lre" | "previred" | "f30_1";
}) {
  const conErrores = archivo.errores.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <span className="t-label">
        Validación · {archivo.errores.length} {archivo.errores.length === 1 ? "error" : "errores"} en {archivo.filas} filas
      </span>
      {conErrores ? (
        <Table etiqueta={`Errores del ${ETIQUETA[tipo] ?? tipo}`}>
          <thead><tr><Th>Persona</Th><Th>Error</Th></tr></thead>
          <tbody>
            {archivo.errores.map((e, i) => (
              <tr key={`${e.personaId ?? "empresa"}-${i}`}>
                <Td>{e.personaId ? (e.personaNombre ?? "Persona") : "Empresa"}</Td>
                <Td>{e.mensaje}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      <p className="t-caption text-fg-muted">{archivo.advertencias.join(" ")}</p>
    </div>
  );
}
