// Fechas del DS en es-CL: el usuario ve dd-mm-aaaa; el valor que viaja es ISO aaaa-mm-dd.

/** Deja solo dígitos (máx. 8) y los agrupa como dd-mm-aaaa mientras se escribe. */
export function aplicarMascara(texto: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto.trim())) return isoAMascara(texto.trim());
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

/** ISO `aaaa-mm-dd` → `dd-mm-aaaa`; cualquier otro valor da vacío. */
export function isoAMascara(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

/** `dd-mm-aaaa` → ISO si es una fecha real del calendario; si no, vacío. */
export function mascaraAIso(texto: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto);
  if (!m) return "";
  const [, dd, mm, aaaa] = m;
  const f = new Date(Date.UTC(Number(aaaa), Number(mm) - 1, Number(dd)));
  const ok =
    f.getUTCFullYear() === Number(aaaa) &&
    f.getUTCMonth() === Number(mm) - 1 &&
    f.getUTCDate() === Number(dd);
  return ok ? `${aaaa}-${mm}-${dd}` : "";
}
