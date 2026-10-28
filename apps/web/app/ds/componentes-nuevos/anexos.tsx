import { AvisoAnexo, DocumentoBorrador, PanelAprobacion } from "@opai/ds";

const filas = [
  { concepto: "Sueldo base", antes: "$ 600.000", despues: "$ 650.000" },
  { concepto: "Colación", antes: "$ 0", despues: "$ 0" },
];

export function MuestraAnexos() {
  return (
    <section aria-label="Componentes del anexo de contrato" className="flex flex-col gap-4">
      <h2 className="t-heading">Anexo de contrato · DS 2.0</h2>
      <AvisoAnexo estado="borrador" motivoCambio="monto" />
      <AvisoAnexo estado="aprobado" motivoCambio="instalacion" />
      <AvisoAnexo estado="rechazado" motivoCambio="capa" motivoRechazo="No corresponde todavía." />
      <DocumentoBorrador filas={filas} />
      <PanelAprobacion
        pendiente={false}
        error={null}
        onAprobar={() => undefined}
        onRechazar={() => undefined}
      />
      <PanelAprobacion
        resuelto={{ estado: "aprobado", por: "Ana", en: "2026-03-01" }}
        pendiente={false}
        error={null}
        onAprobar={() => undefined}
        onRechazar={() => undefined}
      />
    </section>
  );
}
