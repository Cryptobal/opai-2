/** HTML renderizado con marco A4, scroll vertical y sin scripts (sandbox vacío). */
export function VistaHtmlA4({ html, titulo }: { html: string; titulo: string }) {
  return (
    <iframe
      title={titulo}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={html}
      className="h-[min(80vh,900px)] w-full rounded-md border border-border bg-[#e8eaed]"
    />
  );
}