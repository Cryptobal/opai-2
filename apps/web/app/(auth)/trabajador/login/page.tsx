import { FormularioPin } from "./formulario-pin";

export const metadata = { title: "Trabajador" };

/** Login Trabajador (RUT + PIN). `?next=` lleva a la ruta del portal a la que se quería entrar. */
export default async function LoginTrabajador({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <FormularioPin destino={Array.isArray(next) ? (next[0] ?? "") : (next ?? "")} />;
}
