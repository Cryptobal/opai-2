// Genera los PDF de los fixtures ficticios en docs/2.0/evidencia/pdf-dte/ (CAR-221).
// Uso: pnpm --filter @opai/integrations pdf:fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { generarPdfDte, generarPdfPrevio } from "../src/dte/pdf";
import {
  FIXTURE_BORRADOR, FIXTURE_ESTADO_PAGO, FIXTURE_FACTURA, FIXTURE_FACTURA_LARGA, FIXTURE_NC, FIXTURE_PROFORMA,
} from "../src/dte/pdf-fixtures";

const destino = resolve(import.meta.dirname, "../../../docs/2.0/evidencia/pdf-dte");
mkdirSync(destino, { recursive: true });
const dte = [["factura-33-fixture", FIXTURE_FACTURA], ["borrador-33-fixture", FIXTURE_BORRADOR], ["nota-credito-61-fixture", FIXTURE_NC], ["factura-33-larga-fixture", FIXTURE_FACTURA_LARGA]] as const;
for (const [nombre, f] of dte) {
  writeFileSync(resolve(destino, `${nombre}.pdf`), await generarPdfDte(f));
  console.log(`escrito ${nombre}.pdf`);
}
for (const [nombre, f] of [["proforma-fixture", FIXTURE_PROFORMA], ["estado-pago-fixture", FIXTURE_ESTADO_PAGO]] as const) {
  writeFileSync(resolve(destino, `${nombre}.pdf`), await generarPdfPrevio(f));
  console.log(`escrito ${nombre}.pdf`);
}
