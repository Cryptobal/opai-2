/** Plural simple en español para conteos visibles («1 persona», «2 personas»). */
export function conteo(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}
