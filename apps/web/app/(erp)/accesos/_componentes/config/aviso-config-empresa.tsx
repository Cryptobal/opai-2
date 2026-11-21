"use client";

import { Alerta, Button } from "@opai/ds";

export function AvisoConfigEmpresa({ onPersonalizar }: { onPersonalizar: () => void }) {
  return (
    <Alerta tono="info" titulo="Usa la configuración de la empresa">
      <p>Lo que cambies en Configuración › Módulos › Control de acceso rige también aquí.</p>
      <Button variant="secondary" className="mt-2" onClick={onPersonalizar}>
        Personalizar para esta instalación
      </Button>
    </Alerta>
  );
}