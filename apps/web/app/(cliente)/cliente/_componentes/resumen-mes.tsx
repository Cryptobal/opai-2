import { ChevronLeft, ChevronRight } from "lucide-react";

import { Alerta, Card, CardContent, CardHeader, CardTitle, Empty } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { type Cobertura, FilaSeccion, type Rondas, type Seccion } from "./fila-seccion";
import { mesAnterior, mesSiguiente, nombreDeMes } from "./mes";

export type ResumenMes = {
  cuentaNombre: string;
  mes: string;
  mesEnCurso: boolean;
  limitado: boolean;
  instalaciones: {
    id: string;
    nombre: string;
    direccion: string | null;
    secciones: Seccion[];
    cobertura: Cobertura | null;
    rondas: Rondas | null;
  }[];
};

/**
 * Resumen del mes = informe mensual (01, B14): una tarjeta por instalación habilitada. Las secciones
 * cuya fuente aún no está integrada se marcan «Pendiente», sin cifras ni porcentajes inventados.
 */
export function ResumenDelMes({ r }: { r: ResumenMes }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-title mb-1 text-fg md:hidden">Resumen del mes</h2>
        <p className="t-caption">{r.cuentaNombre}</p>
        <p className="t-body-sm">
          Este resumen es tu informe mensual: la descarga traerá el mismo contenido.
        </p>
      </div>
      <nav aria-label="Mes del informe" className="flex flex-wrap items-center gap-2">
        <EnlaceBoton href={`/cliente?mes=${mesAnterior(r.mes)}`} variante="secondary" icono={ChevronLeft} aria-label="Mes anterior">
          Anterior
        </EnlaceBoton>
        <span className="t-label min-w-32 text-center">{nombreDeMes(r.mes)}</span>
        {r.mesEnCurso ? null : (
          <EnlaceBoton href={`/cliente?mes=${mesSiguiente(r.mes)}`} variante="secondary" icono={ChevronRight} aria-label="Mes siguiente">
            Siguiente
          </EnlaceBoton>
        )}
        {r.mesEnCurso ? <span className="t-caption">Mes en curso</span> : null}
      </nav>
      {r.limitado ? (
        <Alerta tono="neutral" titulo={`Tu acceso incluye ${r.instalaciones.length} ${r.instalaciones.length === 1 ? "instalación" : "instalaciones"}`}>
          Si necesitas ver otra, pídeselo a tu empresa de seguridad.
        </Alerta>
      ) : null}
      {r.instalaciones.length === 0 ? (
        <Empty
          titulo="Aún no tienes instalaciones habilitadas"
          descripcion="Cuando tu empresa de seguridad habilite tus instalaciones, verás aquí su resumen del mes."
        />
      ) : (
        <>
          <Alerta tono="info" titulo="Datos en conexión">
            Las secciones se van conectando a este resumen. Las que aún no tienen datos aparecen como
            pendientes, sin cifras.
          </Alerta>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {r.instalaciones.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle>{i.nombre}</CardTitle>
                    {i.direccion ? <p className="t-caption truncate">{i.direccion}</p> : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col">
                    {i.secciones.map((s) => (
                      <FilaSeccion key={s.seccion} s={s} cobertura={i.cobertura} rondas={i.rondas} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
