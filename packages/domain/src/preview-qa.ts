// Reglas de la base de vistas previas (Neon `preview/pr-N`): solo empresas `qa-*`, nunca Gard ni datos reales en uso.

export const SLUG_EMPRESA_QA_E2E = "qa-e2e" as const;

/** Slugs de empresas ficticias permitidos en ramas de preview (p. ej. `qa-e2e`, `qa-finanzas-a`). */
export const PATRON_SLUG_QA = /^qa-[a-z0-9-]+$/;

/** Rama Neon efímera por PR. Nunca `main`, `dev`, respaldos ni otras. */
export const RAMA_PREVIEW = /^preview\/pr-[0-9]+$/;

export function esSlugEmpresaQa(slug: string): boolean {
  return PATRON_SLUG_QA.test(slug);
}

export function exigirRamaPreview(rama: string): void {
  if (!RAMA_PREVIEW.test(rama)) {
    throw new Error(`Solo corre en una rama Neon de preview (preview/pr-N); recibió «${rama}».`);
  }
}

/** Siembras y fixtures de preview: únicamente la empresa ficticia `qa-e2e`. */
export function exigirTenantQaE2e(slug: string): void {
  if (slug !== SLUG_EMPRESA_QA_E2E) {
    throw new Error(`Solo la empresa ficticia «${SLUG_EMPRESA_QA_E2E}»; recibió «${slug}».`);
  }
}

export function slugsEmpresasAjenasEnPreview(slugs: readonly string[]): string[] {
  return slugs.filter((s) => !esSlugEmpresaQa(s));
}