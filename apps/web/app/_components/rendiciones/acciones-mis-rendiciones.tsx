import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

type Accesos = { aprobar: boolean; pagar: boolean; reporte: boolean };

export function AccionesMisRendiciones({ accesos, rutaBase }: { accesos: Accesos; rutaBase: string }) {
  return (
    <>
      {accesos.aprobar ? <EnlaceBoton href="/rendiciones/bandeja" variante="secondary">Bandeja del aprobador</EnlaceBoton> : null}
      {accesos.pagar ? <EnlaceBoton href="/rendiciones/lotes" variante="secondary">Lotes de pago</EnlaceBoton> : null}
      {accesos.reporte ? (
        <>
          <EnlaceBoton href="/rendiciones/todas" variante="secondary">Todas las rendiciones</EnlaceBoton>
          <EnlaceBoton href="/rendiciones/reporte" variante="secondary">Reporte</EnlaceBoton>
        </>
      ) : null}
      <EnlaceBoton href={`${rutaBase}/nueva`} className="hidden md:inline-flex">Nueva rendición</EnlaceBoton>
    </>
  );
}