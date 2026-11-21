import { Suspense } from "react";

import { Alerta, Loading } from "@opai/ds";

import { FormularioMarcacionPublica } from "./formulario";
import { verEnlaceMarcacion } from "./ver";

export const metadata = { title: "Marcar asistencia", robots: { index: false, follow: false } };

type Props = { params: Promise<{ codigo: string }> };

async function Contenido({ params }: Props) {
  const { codigo } = await params;
  const v = await verEnlaceMarcacion(codigo);
  if ("limitada" in v)
    return (
      <div className="mx-auto max-w-lg p-4">
        <Alerta tono="warning" titulo="Demasiadas consultas">Espera un minuto e inténtalo de nuevo.</Alerta>
      </div>
    );
  if (!v.ok)
    return (
      <div className="mx-auto max-w-lg p-4">
        <Alerta tono="danger" titulo="Enlace no válido">El enlace no existe o ya no está disponible.</Alerta>
      </div>
    );
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center p-4">
      <FormularioMarcacionPublica
        codigo={codigo}
        instalacion={v.data.instalacionNombre}
        empresa={v.data.empresaNombre}
      />
    </div>
  );
}

export default function Pagina(props: Props) {
  return (
    <Suspense fallback={<Loading variante="detalle" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}