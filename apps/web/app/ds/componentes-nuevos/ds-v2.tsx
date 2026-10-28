"use client";

import { Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Campo, ErrorState, Input, KpiTile } from "@opai/ds";

/** Variantes del DS V2 (ADR-050): botón con carga, destructivo, input compacto, KPI y error. */
export function MuestraDsV2() {
  const [cargando, setCargando] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3" data-muestra="botones-v2">
        <Button cargando={cargando} onClick={() => setCargando(true)}>
          <Save className="size-4" aria-hidden />
          Guardar cambios
        </Button>
        <Button variant="secondary" cargando={cargando}>
          Enviar
        </Button>
        <Button variant="destructive">
          <Trash2 className="size-4" aria-hidden />
          Eliminar
        </Button>
        <Button variant="ghost" onClick={() => setCargando(false)}>
          Detener carga
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Campo etiqueta="Normal (44 px)" htmlFor="v2-normal">
          <Input id="v2-normal" placeholder="Nombre de la cuenta" />
        </Campo>
        <Campo etiqueta="Compacto (36 px desde 768)" htmlFor="v2-compacto">
          <Input id="v2-compacto" compacto placeholder="Filtrar" />
        </Campo>
        <Campo etiqueta="Con error" htmlFor="v2-error" error="El RUT no es válido.">
          <Input id="v2-error" aria-invalid defaultValue="12.345.678-0" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-muestra="kpi-v2">
        <KpiTile etiqueta="Facturado" valor="$ 148.205.000" />
        <KpiTile
          etiqueta="Por cobrar"
          valor="$ 9.730.000"
          variacion={{ texto: "+4,2 %", tono: "warning" }}
        />
        <KpiTile etiqueta="Turnos sin cubrir" valor="2" />
        <KpiTile
          etiqueta="Margen"
          valor="18,4 %"
          variacion={{ texto: "−1,1 pp", tono: "danger" }}
        />
      </div>
      <ErrorState
        titulo="No pudimos cargar las cuentas"
        descripcion="Revisa tu conexión y vuelve a intentar."
        accion={<Button variant="secondary">Reintentar</Button>}
      />
    </div>
  );
}
