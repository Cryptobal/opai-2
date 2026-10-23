import { notFound } from "next/navigation";

import { Alerta, Badge, Button, SeccionTarjeta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Credenciales } from "../_componentes/credenciales";
import { FORM_INTEGRACION, FormIntegracion } from "../_componentes/form-integracion";
import { ProbarConexion } from "../_componentes/probar";
import { CATEGORIA, ESTADO, type Integracion, SUBTITULO } from "../_componentes/tipos";

export const metadata = { title: "Integración" };

type Resumen = { porRecurso: { clave: string; cantidad: number; costoUsd: number }[] };

async function cargar(proveedor: string) {
  if (proveedor !== "ia") {
    const r = await ejecutarComoUsuario<Integracion>("erp", "core.integraciones.get", {
      proveedor,
    });
    return { items: r.ok ? [r.data] : [], error: r.ok ? null : r.error.message, consumo: null };
  }
  const [r, c] = await Promise.all([
    ejecutarComoUsuario<Integracion[]>("erp", "core.integraciones.list", {}),
    ejecutarComoUsuario<Resumen>("erp", "core.consumos.resumen", {}),
  ]);
  const ia = c.ok ? c.data.porRecurso.filter((x) => x.clave.startsWith("ia.")) : [];
  return {
    items: r.ok ? r.data.filter((i) => i.categoria === "ia") : [],
    error: r.ok ? null : r.error.message,
    consumo: c.ok
      ? {
          tokens: ia.reduce((t, x) => t + x.cantidad, 0),
          usd: ia.reduce((t, x) => t + x.costoUsd, 0),
        }
      : null,
  };
}

const guardar = (
  <Button type="submit" form={FORM_INTEGRACION}>
    Guardar
  </Button>
);

/** Detalle de una integración (29): modalidad, credenciales cifradas, configuración y prueba. */
export default function DetalleIntegracion({ params }: { params: Promise<{ proveedor: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Integración"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/integraciones", etiqueta: "Configuración · Integraciones" }}
      accionesTelefono={guardar}
      cargar={async () => cargar((await params).proveedor)}
      opciones={({ items }) => {
        const i = items[0];
        const e = ESTADO[i?.estado ?? ""];
        const disponibles = items.filter((x) => x.estado === "configurada" || x.estado === "error");
        return {
          titulo: i ? (CATEGORIA[i.categoria]?.titulo ?? i.nombre) : "Integración",
          ...(e ? { insignia: <Badge tono={e.tono}>{e.texto}</Badge> } : {}),
          acciones: (
            <>
              <ProbarConexion
                proveedores={(disponibles.length ? disponibles : items).map((x) => x.proveedor)}
              />
              {guardar}
            </>
          ),
        };
      }}
    >
      {({ items, error, consumo }) => {
        if (error) return <Alerta tono="danger" titulo={error} />;
        const i = items[0];
        if (!i || i.estado === "proximamente") notFound();
        return (
          <div className="flex flex-col gap-4">
            <p className="text-base text-fg-muted md:hidden">
              {SUBTITULO[i.proveedor] ?? i.nombre}
            </p>
            {i.ultimoError ? <Alerta tono="danger" titulo={i.ultimoError} /> : null}
            <FormIntegracion items={items}>
              <Credenciales items={items} conNombre={items.length > 1} />
            </FormIntegracion>
            {consumo ? (
              <SeccionTarjeta titulo="Consumo del mes">
                <p className="t-numeric text-md font-semibold text-fg">
                  {consumo.tokens.toLocaleString("es-CL")} tokens · US${" "}
                  {consumo.usd.toLocaleString("es-CL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="t-caption mt-1">
                  Con credenciales propias, el costo lo cobra el proveedor directamente.
                </p>
              </SeccionTarjeta>
            ) : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
