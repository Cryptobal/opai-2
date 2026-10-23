import { notFound } from "next/navigation";

import { Alerta, Badge, Button, SeccionTarjeta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { haceCuanto } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Credenciales } from "../_componentes/credenciales";
import { FORM_INTEGRACION } from "../../_centro/formularios";
import { FormIntegracion } from "../_componentes/form-integracion";
import { ProbarConexion } from "../_componentes/probar";
import { CATEGORIA, ESTADO, type Integracion } from "../_componentes/tipos";

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

/** Estado y resultado de la última prueba; en teléfono, también «Probar conexión» (la barra solo lleva Guardar). */
function PruebaIntegracion({ items }: { items: Integracion[] }) {
  const i = items[0];
  if (!i) return null;
  const e = ESTADO[i.estado];
  const falla = items.find((x) => x.ultimoError);
  const probada = items.find((x) => x.ultimoTestEn);
  const disponibles = items.filter((x) => x.estado === "configurada" || x.estado === "error");
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {e ? <Badge tono={e.tono}>{e.texto}</Badge> : null}
        <ProbarConexion
          proveedores={(disponibles.length ? disponibles : items).map((x) => x.proveedor)}
        />
      </div>
      {falla ? (
        <Alerta
          tono="danger"
          titulo={`La última prueba falló${falla.ultimoTestEn ? ` ${haceCuanto(falla.ultimoTestEn)}` : ""}`}
        >
          {falla.ultimoError}
        </Alerta>
      ) : probada?.ultimoTestEn ? (
        <Alerta
          tono="success"
          titulo={`Última prueba correcta ${haceCuanto(probada.ultimoTestEn)}`}
        />
      ) : null}
    </>
  );
}

/** Detalle de una integración (29): modalidad, credenciales cifradas, configuración y prueba. */
export default function DetalleIntegracion({ params }: { params: Promise<{ proveedor: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Integración"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/integraciones", etiqueta: "Integraciones" }}
      accionesTelefono={guardar}
      cargar={async () => cargar((await params).proveedor)}
      opciones={({ items }) => {
        const i = items[0];
        const e = ESTADO[i?.estado ?? ""];
        const disponibles = items.filter((x) => x.estado === "configurada" || x.estado === "error");
        return {
          titulo: i
            ? items.length === 1
              ? i.nombre
              : (CATEGORIA[i.categoria]?.titulo ?? i.nombre)
            : "Integración",
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
            <PruebaIntegracion items={items} />
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
