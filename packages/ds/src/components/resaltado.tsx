export type OpcionCombobox = { valor: string; etiqueta: string; detalle?: string };

/** Resalta en negrita la parte que coincide con la búsqueda. */
export function Resaltado({ texto, q }: { texto: string; q: string }) {
  const i = q ? texto.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <b className="font-semibold">{texto.slice(i, i + q.length)}</b>
      {texto.slice(i + q.length)}
    </>
  );
}
