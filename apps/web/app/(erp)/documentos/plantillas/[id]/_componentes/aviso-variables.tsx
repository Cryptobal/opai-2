"use client";

import { Alerta, Button } from "@opai/ds";

/** Alerta del diseño 06: variables que no existen; «Ver en el texto» las selecciona. */
export function AvisoVariables({
  desconocidas,
  onVer,
}: {
  desconocidas: readonly string[];
  onVer: (clave: string) => void;
}) {
  const primera = desconocidas[0];
  if (!primera) return null;
  const titulo =
    desconocidas.length === 1
      ? `La variable {${primera}} no existe`
      : `${desconocidas.length} variables no existen: {${desconocidas.join("}, {")}}`;
  return (
    <Alerta
      tono="danger"
      titulo={titulo}
      className="hidden md:flex"
      accion={
        <Button variant="ghost" onClick={() => onVer(primera)}>
          Ver en el texto
        </Button>
      }
    >
      {desconocidas.length === 1 ? "Cámbiala" : "Cámbialas"} por una de la lista o{" "}
      {desconocidas.length === 1 ? "quítala" : "quítalas"} antes de publicar.
    </Alerta>
  );
}
