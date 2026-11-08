// Genera los PDF de los fixtures ficticios en docs/2.0/evidencia/pdf-dte/ (CAR-221).
// Uso: pnpm --filter @opai/integrations pdf:fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { generarPdfDte } from "../src/dte/pdf";
import { FIXTURE_FACTURA, FIXTURE_NC } from "../src/dte/pdf-fixtures";

const destino = resolve(import.meta.dirname, "../../../docs/2.0/evidencia/pdf-dte");
mkdirSync(destino, { recursive: true });
for (const [nombre, f] of [["factura-33-fixture", FIXTURE_FACTURA], ["nota-credito-61-fixture", FIXTURE_NC]] as const) {
  writeFileSync(resolve(destino, `${nombre}.pdf`), await generarPdfDte(f));
  console.log(`escrito ${nombre}.pdf`);
}
