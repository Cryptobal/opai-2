"use client";

import { Alerta, avisar, Button, Campo, Input, Select, SeccionTarjeta } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import { useCapacidad } from "@/app/_components/use-capacidad";

const FRECUENCIAS = [
  { valor: "desactivado", etiqueta: "Desactivado" },
  { valor: "diario", etiqueta: "Diario" },
  { valor: "semanal", etiqueta: "Semanal (lunes)" },
  { valor: "mensual", etiqueta: "Mensual (día 1)" },
];

function parseDestinatarios(texto: string): string[] {
  return texto
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function EditorReportes({
  instalacionId,
  config,
  onCambiar,
  disabled,
}: {
  instalacionId?: string;
  config: ConfigAcceso;
  onCambiar: (c: Partial<ConfigAcceso>) => void;
  disabled: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const dest = config.reporteDestinatarios.join(", ");
  async function probar() {
    const r = await ejecutar<{ enviados: number }>(
      "acceso.reportes.probar",
      instalacionId ? { instalacionId } : {},
    );
    if (r) avisar.exito(`Correo de prueba enviado a ${r.enviados} destinatario(s).`);
  }
  return (
    <SeccionTarjeta titulo="Reportes por correo">
      <p className="t-caption mb-2 px-4">
        Incluye todos los registros del período; los documentos van enmascarados (R27).
      </p>
      <div className="grid gap-3 px-4 pb-2 sm:grid-cols-2">
        <Campo etiqueta="Frecuencia" htmlFor="rep-frec">
          <Select
            id="rep-frec"
            valor={config.reporteFrecuencia}
            opciones={FRECUENCIAS}
            disabled={disabled}
            onCambiar={(v) =>
              onCambiar({ reporteFrecuencia: v as ConfigAcceso["reporteFrecuencia"] })
            }
          />
        </Campo>
        <Campo etiqueta="Destinatarios" htmlFor="rep-correos" ayuda="Correos separados por coma.">
          <Input
            id="rep-correos"
            disabled={disabled}
            value={dest}
            onChange={(e) => onCambiar({ reporteDestinatarios: parseDestinatarios(e.target.value) })}
          />
        </Campo>
      </div>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4" /> : null}
      <div className="px-4 pb-4">
        <Button variant="secondary" disabled={pendiente || !dest.trim()} onClick={() => void probar()}>
          Enviar prueba
        </Button>
      </div>
    </SeccionTarjeta>
  );
}