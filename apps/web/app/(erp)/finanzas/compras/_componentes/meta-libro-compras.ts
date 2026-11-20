export function metaLibroCompras(
  resumen: { documentos: number; total: number } | undefined,
  items: readonly { saldoPorPagar: number }[],
  conSaldo: boolean,
  pesos: (monto: number) => string,
) {
  const libro = resumen ? `${resumen.documentos} documentos · Total ${pesos(resumen.total)}` : null;
  if (!conSaldo) return libro ?? `${items.length} documentos`;
  const saldoPagina = items.reduce((total, item) => total + item.saldoPorPagar, 0);
  const pagina = `${items.length} documentos en esta página · Saldo de esta página ${pesos(saldoPagina)}`;
  return libro ? `${pagina} · Resumen del libro sin filtro de saldo: ${libro}` : pagina;
}
