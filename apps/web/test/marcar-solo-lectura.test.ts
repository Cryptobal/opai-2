import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Ejecuta el cuerpo real del callback sin renderizar: el bloqueo debe preceder incluso a sus dependencias.
const fuente = readFileSync(new URL("../app/_components/asistencia/marcar.tsx", import.meta.url), "utf8");
const cuerpo = fuente.split("async function conPin() {")[1]!.split("\n  }\n")[0]!;
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

describe("PIN en vista de solo lectura", () => {
  it("sale antes de leer estado, ubicación o intentar encolar, aunque se invoque el callback", async () => {
    const ejecutar = new AsyncFunction("soloLectura", cuerpo);
    await expect(ejecutar(true)).resolves.toBeUndefined();
    // Sin la guarda, la primera dependencia no inyectada falla: prueba que el cuerpo no fue omitido.
    await expect(ejecutar(false)).rejects.toThrow(ReferenceError);
  });
});
