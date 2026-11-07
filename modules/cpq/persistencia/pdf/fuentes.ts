import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

import { INTER_400, INTER_600, INTER_700, MONO_400 } from "./fuentes-datos";

export type Fuentes = { normal: PDFFont; semi: PDFFont; negrita: PDFFont; mono: PDFFont };

const bytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));

/** Incrusta Inter (texto) y JetBrains Mono (cifras y códigos) con Unicode; subconjunto por documento. */
export async function incrustarFuentes(doc: PDFDocument): Promise<Fuentes> {
  doc.registerFontkit(fontkit);
  const [normal, semi, negrita, mono] = await Promise.all([
    doc.embedFont(bytes(INTER_400), { subset: true }),
    doc.embedFont(bytes(INTER_600), { subset: true }),
    doc.embedFont(bytes(INTER_700), { subset: true }),
    doc.embedFont(bytes(MONO_400), { subset: true }),
  ]);
  return { normal, semi, negrita, mono };
}
