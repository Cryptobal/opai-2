"use client";

import { ETIQUETA_AREA, type AreaNav } from "@opai/domain";
import { Alerta, Button, RadioGroup, SeccionTarjeta } from "@opai/ds";

import { useNavegacionArea } from "@/app/_components/use-navegacion-area";
import { entradasAreaPrincipal, type GrupoArea } from "@/lib/navegacion-areas";

export function AreaPrincipal({ grupos }: { grupos: GrupoArea[] }) {
  const prefs = useNavegacionArea("erp", true);
  const opciones = grupos
    .filter((g) => g.area !== "inicio")
    .map((g) => ({
      valor: g.area,
      etiqueta: ETIQUETA_AREA[g.area],
      descripcion: [
        "Inicio",
        ...entradasAreaPrincipal(grupos, g.area).map((e) => e.etiqueta),
        "Más",
      ].join(" · "),
    }));
  return (
    <SeccionTarjeta titulo="Área principal">
      <p className="t-body-sm mb-3 text-fg-muted">
        Elige qué aparece en la barra inferior del teléfono.
      </p>
      {prefs.errorCarga ? (
        <Alerta tono="danger" titulo="No se pudieron cargar tus preferencias">
          <Button variant="secondary" onClick={() => void prefs.reintentar()}>
            Reintentar
          </Button>
        </Alerta>
      ) : null}
      <RadioGroup
        etiqueta="Área principal"
        valor={prefs.areaPrincipal ?? "defecto"}
        opciones={[
          { valor: "defecto", etiqueta: "Según mi rol", descripcion: "Usar la barra por defecto" },
          ...opciones,
        ].map((o) => ({ ...o, disabled: !prefs.cargado }))}
        onCambiar={(a) => {
          prefs.elegirAreaPrincipal(a === "defecto" ? null : (a as AreaNav));
          // El shell también lee la preferencia después de guardarse (evento de la capacidad).
        }}
      />
    </SeccionTarjeta>
  );
}
