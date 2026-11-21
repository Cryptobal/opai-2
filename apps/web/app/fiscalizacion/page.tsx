import { Alerta, Button } from "@opai/ds";

import { buscarEmpleadorFiscalizacion, ingresarFiscalizacion, salirFiscalizacion, sesionFiscalizacionActual } from "./acciones";
import { FormIngreso } from "./form-ingreso";
import { PanelConsulta } from "./panel-consulta";

export const metadata = { title: "Portal de fiscalización", robots: { index: false, follow: false } };

export default async function FiscalizacionPage() {
  const sesion = await sesionFiscalizacionActual();
  return (
    <main className="min-h-dvh bg-surface">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-[17px] leading-6 font-bold tracking-[-0.02em] text-fg">
          OPAI<span className="ml-1.5 font-medium text-fg-muted">Fiscalización</span>
        </p>
        {sesion ? (
          <form action={salirFiscalizacion}>
            <Button type="submit" variant="ghost" size="md">Salir</Button>
          </form>
        ) : null}
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        {!sesion ? (
          <FormIngreso action={ingresarFiscalizacion} />
        ) : (
          <>
            <Alerta tono="neutral" titulo="Acceso registrado">
              {sesion.correo} · solo lectura
            </Alerta>
            <PanelConsulta
              rutInicial={sesion.empleadorRut}
              buscar={buscarEmpleadorFiscalizacion}
            />
          </>
        )}
      </div>
    </main>
  );
}