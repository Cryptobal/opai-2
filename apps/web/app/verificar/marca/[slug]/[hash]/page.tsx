import { Suspense } from "react";

import { Alerta, AuthCard, Loading, Pares } from "@opai/ds";

import { verificarMarcaPublica } from "./ver";

export const metadata = { title: "Verificar marca", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string; hash: string }> };

const TIPOS: Record<string, string> = {
  entrada: "Entrada", salida: "Salida", inicio_colacion: "Inicio de colación", fin_colacion: "Fin de colación",
};

const formato = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "medium", timeZone: "America/Santiago" });

async function Contenido({ params }: Props) {
  const { slug, hash } = await params;
  const v = await verificarMarcaPublica(slug, hash);
  if ("limitada" in v)
    return (
      <AuthCard titulo="Verificar marca">
        <Alerta tono="warning" titulo="Demasiadas consultas">Espera un minuto e inténtalo de nuevo.</Alerta>
      </AuthCard>
    );
  if (!v.ok)
    return (
      <AuthCard titulo="Verificar marca">
        <Alerta tono="danger" titulo="Marca no encontrada">
          El código no corresponde a una marca registrada en OPAI.
        </Alerta>
      </AuthCard>
    );
  const m = v.data;
  return (
    <AuthCard titulo="Verificar marca" subtitulo={m.empresa ?? ""}>
      <div className="flex flex-col gap-4">
        {m.integra ? (
          <Alerta tono="success" titulo="Marca íntegra">
            El registro coincide con su huella (SHA-256): no fue alterado.
          </Alerta>
        ) : (
          <Alerta tono="danger" titulo="La marca no coincide con su huella">
            Avisa a la empresa y a la Dirección del Trabajo.
          </Alerta>
        )}
        <Pares
          items={[
            { etiqueta: "Tipo", valor: TIPOS[m.tipo ?? ""] ?? m.tipo ?? "" },
            { etiqueta: "Fecha y hora del servidor", valor: m.horaServidor ? formato.format(new Date(m.horaServidor)) : "" },
            { etiqueta: "Establecimiento", valor: m.establecimiento ?? "—" },
            { etiqueta: "Código de verificación", valor: m.codigo ?? "" },
          ]}
        />
      </div>
    </AuthCard>
  );
}

export default function Pagina(props: Props) {
  return (
    <Suspense fallback={<Loading variante="detalle" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
