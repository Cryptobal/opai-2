const cap = (t: string) => (t ? t[0]!.toUpperCase() + t.slice(1) : t);

/** Nombre de pila para saludar: «Ana María Soto» → «Ana»; si solo hay un correo, «carlos.irigoyen@x.cl» → «Carlos». */
export function nombreDePila(nombre: string): string {
  const t = nombre.trim();
  if (!t.includes("@")) return t.split(/\s+/)[0] ?? t;
  const local = t.split("@")[0] ?? "";
  return cap((local.split(/[._-]+/)[0] ?? local).toLowerCase());
}
