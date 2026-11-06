import { createHash } from "node:crypto";

import ExcelJS from "exceljs";

import { ajuste, conflicto, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { numeroDeCuenta } from "./lotes-util";
import { agruparPorBeneficiario, COLUMNAS_NOMINA, filasDeNomina, totalNomina, validarFilasNomina, type FilaNomina } from "../domain";

type ItemLote = { personaId: string; cuentaVersion: Date; montoClp: number };

/** Mientras el formato no esté confirmado por Carlos no se genera ni se descarga nada (DECISIÓN CARLOS, CAR-208). */
export async function exigirFormatoConfirmado(ctx: Contexto): Promise<void> {
  if (!(await ajuste<boolean>(ctx, "rendiciones", "nomina_formato_confirmado")))
    throw reglaDeNegocio(
      "El formato de la nómina Santander aún no está confirmado: falta la especificación o un archivo de ejemplo (DECISIÓN CARLOS). El lote se puede aprobar y marcar como pagado sin archivo.",
    );
}

/**
 * Filas de la nómina desde la ficha de cada persona, leídas ahora (la cuenta no se copia al lote). Si la ficha cambió
 * desde que se armó el lote, falla: se anula y se arma otro. Una transferencia por beneficiario.
 */
export async function armarNomina(ctx: Contexto, items: readonly ItemLote[], glosa: string) {
  const cuentaOrigen = await ajuste<string>(ctx, "rendiciones", "nomina_cuenta_origen");
  const porPersona = new Map<string, number>();
  for (const i of items) porPersona.set(i.personaId, (porPersona.get(i.personaId) ?? 0) + i.montoClp);
  const filas: FilaNomina[] = [];
  for (const [personaId, montoClp] of porPersona) {
    const p = await ctx.db.persona.findFirst({ where: { id: personaId }, select: { nombres: true, apellidos: true, emailPersonal: true, pago: { select: { bancoCodigo: true, rutTitular: true, updatedAt: true } } } });
    const versiones = items.filter((i) => i.personaId === personaId).map((i) => i.cuentaVersion.getTime());
    if (!p?.pago?.bancoCodigo || !p.pago.rutTitular) throw reglaDeNegocio("Una persona del lote ya no tiene datos bancarios en su ficha.");
    if (versiones.some((v) => v !== p.pago!.updatedAt.getTime())) throw conflicto("Una cuenta cambió en la ficha después de armar el lote: anúlalo y arma otro.");
    filas.push({ cuentaDestino: await numeroDeCuenta(ctx, personaId), codigoBanco: p.pago.bancoCodigo, rut: p.pago.rutTitular, nombre: `${p.nombres} ${p.apellidos}`, montoClp, correo: p.emailPersonal ?? null });
  }
  const unicas = agruparPorBeneficiario(filas);
  const errores = validarFilasNomina(unicas, { cuentaOrigen, glosa });
  if (errores.length > 0) throw reglaDeNegocio(errores.join(" "));
  const matriz = filasDeNomina(unicas, { cuentaOrigen, glosa });
  return { matriz, filas: unicas.length, totalClp: totalNomina(unicas), huella: createHash("sha256").update(JSON.stringify(matriz)).digest("hex") };
}

export async function xlsxDeNomina(matriz: readonly (string | number)[][]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Nómina");
  hoja.addRow([...COLUMNAS_NOMINA]);
  for (const f of matriz) hoja.addRow([...f]);
  return Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");
}
