import {
  Alerta,
  DatoArchivado,
  AntesDespues,
  BadgeCapa,
  ImpactoCambio,
  PilaCapas,
  TablaEstructura,
  VersionesVigencia,
} from "@opai/ds";

const estructura = {
  sueldoBase: 600000,
  colacion: 0,
  movilizacion: 0,
  gratificacion: "ninguna",
  gratificacionMonto: null,
  sensible: false,
  items: [],
};
export function MuestraCapasSueldo() {
  const impacto = {
    puestos: 2,
    personasRut: 0,
    borradores: 0,
    pendientesVinculo: 3,
    diferencias: [{ concepto: "Sueldo base", antes: 600000, despues: 650000, diferencia: 50000 }],
  };
  return (
    <section aria-label="Componentes de capas de sueldo" className="flex flex-col gap-4">
      <h2 className="t-heading">Capas de sueldo · DS 2.0</h2>
      <DatoArchivado titulo="Versión del 01-01-2025" periodo="01-01-2025 – 31-12-2025">
        <TablaEstructura estructura={estructura} />
      </DatoArchivado>
      <DatoArchivado titulo="Capa cargo (retirada) · montos restringidos">
        <TablaEstructura estructura={{ ...estructura, sensible: true }} />
      </DatoArchivado>
      <BadgeCapa capa="instalacion" />
      <PilaCapas
        capa="instalacion"
        capas={{ persona: null, puesto: null, instalacion: { vigenteDesde: "2026-01-01" } }}
      />
      <TablaEstructura
        estructura={estructura}
        origen={{ capa: "instalacion", version: "2026-01-01" }}
      />
      <TablaEstructura
        estructura={{ ...estructura, sensible: true }}
        origen={{ capa: "persona", version: "2026-01-01" }}
      />
      <Alerta
        tono="warning"
        titulo="Estructura incompleta: define los conceptos faltantes en una nueva versión"
      />
      <AntesDespues diferencias={impacto.diferencias} />
      <ImpactoCambio impacto={impacto} />
      <VersionesVigencia
        versiones={[
          {
            id: "ejemplo",
            desde: "2026-01-01",
            hasta: null,
            estado: "vigente",
            contenido: <TablaEstructura estructura={estructura} />,
          },
        ]}
      />
    </section>
  );
}
