import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixture33 = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures/finanzas/caf-sintetico-33.xml"),
  "utf8",
);

/** XML CAF sintético para tests (RUT 76111222-8, IDK de certificación). */
export function cafXmlSintetico(opts?: {
  tipoDte?: number;
  folioDesde?: number;
  folioHasta?: number;
  rut?: string;
  fa?: string;
  idk?: string;
}): string {
  let xml = fixture33;
  if (opts?.tipoDte != null) xml = xml.replace(/<TD>33<\/TD>/, `<TD>${opts.tipoDte}</TD>`);
  if (opts?.folioDesde != null) xml = xml.replace(/<D>5000<\/D>/, `<D>${opts.folioDesde}</D>`);
  if (opts?.folioHasta != null) xml = xml.replace(/<H>5020<\/H>/, `<H>${opts.folioHasta}</H>`);
  if (opts?.rut != null) xml = xml.replace(/<RE>76111222-8<\/RE>/, `<RE>${opts.rut}</RE>`);
  if (opts?.fa != null) xml = xml.replace(/<FA>2026-06-15<\/FA>/, `<FA>${opts.fa}</FA>`);
  if (opts?.idk != null) xml = xml.replace(/<IDK>CERT-SINTETICO-OPAI2-TEST<\/IDK>/, `<IDK>${opts.idk}</IDK>`);
  return xml;
}
