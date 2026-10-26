"use client";

import { useState } from "react";

import {
  Button,
  Campo,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  KpiTile,
} from "@opai/ds";

/** Variantes del DS V2 (Claude Design 44e4d7b9): botón en curso, input denso, bordes de control y KPI. */
export function BloqueVariantesV2() {
  const [enCurso, setEnCurso] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="t-heading text-fg">Variantes del DS V2</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Botón · en curso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button loading={enCurso} onClick={() => setEnCurso(true)}>
              Guardar cambios
            </Button>
            <Button variant="destructive" loading>
              Revocar
            </Button>
            <Button variant="destructive">Eliminar</Button>
            <Button variant="secondary" onClick={() => setEnCurso(false)}>
              Restablecer
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Input · bordes de control</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Campo etiqueta="Estándar (44 px)" htmlFor="v2-std">
              <Input id="v2-std" placeholder="Nombre" />
            </Campo>
            <Campo etiqueta="Compacto (36 px)" htmlFor="v2-compact">
              <Input id="v2-compact" compact placeholder="Filtrar" />
            </Campo>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3">
          <div className="w-40">
            <KpiTile etiqueta="Turnos cubiertos" valor="1.248" />
          </div>
          <div className="w-64">
            <KpiTile etiqueta="Turnos cubiertos" valor="1.248" />
          </div>
        </div>
      </div>
      <ErrorState titulo="No pudimos cargar los datos" descripcion="Reintenta en un momento." />
    </section>
  );
}
