"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearRut, VERTICALES, vocabulario } from "@opai/domain";
import { Button, Campo, FormScreen, Input, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Creado = { tenantId: string; adoptado: boolean };

/** Plataforma → Nueva empresa: crea (o adopta si el slug existe) e invita al primer owner. */
export function NuevoTenant() {
  const router = useRouter();
  const { ejecutar, error, codigo } = useCapacidad("platform");
  const [datos, setDatos] = useState({
    slug: "",
    nombre: "",
    razonSocial: "",
    rut: "",
    vertical: "seguridad",
    timezone: "America/Santiago",
    adminEmail: "",
  });
  const [enviando, setEnviando] = useState(false);
  const campo = (k: keyof typeof datos) => ({
    value: datos[k],
    onChange: (e: { target: { value: string } }) => setDatos({ ...datos, [k]: e.target.value }),
  });

  async function crear(adoptarExistente: boolean) {
    setEnviando(true);
    const r = await ejecutar<Creado>("platform.tenants.create", { ...datos, adoptarExistente });
    setEnviando(false);
    if (r) router.push(`/platform/tenants/${r.tenantId}`);
  }

  return (
    <FormScreen
      state="ready"
      titulo="Nueva empresa"
      subtitulo="Queda en prueba con el núcleo activo. El administrador recibe una invitación por correo."
      formProps={{ onSubmit: (e) => (e.preventDefault(), void crear(false)) }}
      secciones={[
        {
          id: "empresa",
          titulo: "Empresa",
          contenido: (
            <>
              <Campo etiqueta="Nombre" htmlFor="t-nombre">
                <Input id="t-nombre" required {...campo("nombre")} />
              </Campo>
              <Campo etiqueta="Razón social" htmlFor="t-razon" ayuda="La que va en las facturas.">
                <Input id="t-razon" required {...campo("razonSocial")} />
              </Campo>
              <Campo
                etiqueta="RUT"
                htmlFor="t-rut"
                ayuda="Con guion y dígito verificador, por ejemplo 76.123.456-0. No puede estar en otra empresa."
              >
                <Input
                  id="t-rut"
                  required
                  autoCapitalize="characters"
                  value={datos.rut}
                  onChange={(e) => setDatos({ ...datos, rut: e.target.value })}
                  onBlur={() => setDatos((d) => ({ ...d, rut: formatearRut(d.rut) }))}
                />
              </Campo>
              <Campo
                etiqueta="Slug"
                htmlFor="t-slug"
                ayuda="Minúsculas, dígitos y guiones. Va en las API keys y enlaces."
              >
                <Input
                  id="t-slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  autoCapitalize="none"
                  {...campo("slug")}
                />
              </Campo>
              <Campo etiqueta="Vertical" htmlFor="t-vertical">
                <Select
                  id="t-vertical"
                  valor={datos.vertical}
                  onCambiar={(v) => setDatos((d) => ({ ...d, vertical: v }))}
                  opciones={VERTICALES.map((v) => ({
                    valor: v,
                    etiqueta: vocabulario(v).vertical,
                  }))}
                />
              </Campo>
              <Campo etiqueta="Zona horaria" htmlFor="t-tz">
                <Input id="t-tz" {...campo("timezone")} />
              </Campo>
            </>
          ),
        },
        {
          id: "admin",
          titulo: "Primer administrador",
          descripcion: "Recibirá una invitación como owner.",
          contenido: (
            <Campo etiqueta="Correo" htmlFor="t-admin" {...(error ? { error } : {})}>
              <Input
                id="t-admin"
                type="email"
                inputMode="email"
                required
                {...campo("adminEmail")}
              />
            </Campo>
          ),
        },
      ]}
      acciones={
        <>
          {codigo === "CONFLICT" && error?.includes("existente") ? (
            <Button variant="secondary" onClick={() => void crear(true)} disabled={enviando}>
              Usar la existente
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => router.push("/platform")}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={enviando}>
            {enviando ? "Creando…" : "Crear empresa"}
          </Button>
        </>
      }
    />
  );
}
