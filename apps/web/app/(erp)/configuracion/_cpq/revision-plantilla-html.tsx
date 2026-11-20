import { Alerta, Badge } from "@opai/ds";

type Problema = { codigo: string; mensaje: string; detalle?: string };
export type RevisionHtml = {
  guardada: boolean;
  sinCambios: boolean;
  activa: boolean;
  version: number | null;
  html: string | null;
  problemas: Problema[];
  advertencias: Problema[];
  tokens: { usados: string[] };
};

/** HTML ya saneado en un marco aislado: sin scripts, sin red y sin acceso a la página. */
export function VistaHtml({
  html,
  titulo,
  alto = "h-96",
}: {
  html: string;
  titulo: string;
  alto?: string;
}) {
  return (
    <iframe
      title={titulo}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={html}
      className={`${alto} w-full rounded-md border border-border bg-white`}
    />
  );
}

function Lista({ items }: { items: Problema[] }) {
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4">
      {items.map((p, i) => (
        <li key={`${p.codigo}-${i}`}>
          {p.mensaje}
          {p.detalle ? <code className="ml-1 font-mono">{p.detalle}</code> : null}
        </li>
      ))}
    </ul>
  );
}

/** Resultado del saneado: errores que impiden guardar, avisos, marcadores reconocidos y la vista previa. */
export function RevisionPlantillaHtml({ r }: { r: RevisionHtml }) {
  return (
    <div className="flex flex-col gap-3">
      {r.problemas.length > 0 ? (
        <Alerta tono="danger" titulo="No se puede guardar: corrige el HTML">
          <Lista items={r.problemas} />
        </Alerta>
      ) : null}
      {r.advertencias.length > 0 ? (
        <Alerta tono="warning" titulo="Se quitó del HTML">
          <Lista items={r.advertencias} />
        </Alerta>
      ) : null}
      {r.sinCambios ? (
        <Alerta
          tono="info"
          titulo={`Es igual a la versión v${r.version} en uso: no se guarda otra.`}
        />
      ) : null}
      {r.html !== null && r.problemas.length === 0 && !r.sinCambios ? (
        <p className="t-caption text-fg-muted">
          Se guardará como v{r.version}
          {r.activa ? " y quedará en uso." : ", inactiva: actívala para usarla."}
        </p>
      ) : null}
      {r.tokens.usados.length > 0 ? (
        <div className="flex flex-wrap gap-1" aria-label="Marcadores reconocidos">
          {r.tokens.usados.map((t) => (
            <Badge key={t} tono="neutro">{`{{${t}}}`}</Badge>
          ))}
        </div>
      ) : null}
      {r.html ? <VistaHtml html={r.html} titulo="Vista previa del HTML subido" /> : null}
    </div>
  );
}
