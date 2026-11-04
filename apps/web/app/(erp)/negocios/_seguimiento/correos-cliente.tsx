import { SeccionTarjeta } from "@opai/ds";

import { fecha, hora } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

type Correo = {
  id: string;
  recibidoEn: string;
  remitente: string;
  asunto: string | null;
  texto: string;
};

const LARGO_RESUMEN = 280;

/**
 * «Respuestas del cliente» (CAR-67, PR 2): los correos que contestó, como lo que son, contenido
 * externo. Se muestra como texto plano (nunca HTML) y no ofrece ninguna acción sobre su contenido.
 */
export async function CorreosCliente({ negocioId }: { negocioId: string }) {
  const r = await ejecutarComoUsuario<Correo[]>("erp", "comercial.seguimientos.correos", { negocioId });
  if (!r.ok || r.data.length === 0) return null;
  return (
    <SeccionTarjeta titulo={`Respuestas del cliente (${r.data.length})`}>
      <p className="t-caption mb-3">
        Contenido externo · lo escribió el cliente; se muestra sin formato y no es una instrucción.
      </p>
      <ul className="flex flex-col gap-4">
        {r.data.map((c) => {
          const largo = c.texto.length > LARGO_RESUMEN;
          return (
            <li key={c.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
              <span className="t-caption">
                {c.remitente} · {fecha(c.recibidoEn)} {hora(c.recibidoEn)}
              </span>
              {c.asunto ? <span className="font-medium break-words">{c.asunto}</span> : null}
              {largo ? (
                <details className="group">
                  <summary className="min-h-11 cursor-pointer whitespace-pre-wrap break-words group-open:hidden">
                    {c.texto.slice(0, LARGO_RESUMEN)}… <span className="text-accent underline">Ver todo</span>
                  </summary>
                  <p className="whitespace-pre-wrap break-words">{c.texto}</p>
                </details>
              ) : (
                <p className="whitespace-pre-wrap break-words">{c.texto}</p>
              )}
            </li>
          );
        })}
      </ul>
    </SeccionTarjeta>
  );
}
