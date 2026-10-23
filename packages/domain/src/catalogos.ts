// Catálogos base del núcleo (Brief 02): cargos por vertical, tipos de documento por capa y lista de
// precios de recursos. Son datos, no lógica: los usan los seeds y `platform.tenants.create`.
import type { Vertical } from "./vocabulario";

export type CargoBase = {
  nombre: string;
  clase: "operativo" | "administrativo";
  sueldoBase: number;
};

/** Cargos por defecto de cada vertical con un sueldo base de referencia (CLP, editable). */
export const CARGOS_POR_VERTICAL: Readonly<Record<Vertical, readonly CargoBase[]>> = {
  seguridad: [
    { nombre: "Guardia", clase: "operativo", sueldoBase: 560_000 },
    { nombre: "Supervisor", clase: "operativo", sueldoBase: 850_000 },
    { nombre: "Operador CCTV", clase: "operativo", sueldoBase: 620_000 },
    { nombre: "Jefe de turno", clase: "operativo", sueldoBase: 700_000 },
    { nombre: "Administrativo", clase: "administrativo", sueldoBase: 900_000 },
  ],
  aseo: [
    { nombre: "Operario de aseo", clase: "operativo", sueldoBase: 539_000 },
    { nombre: "Supervisor de aseo", clase: "operativo", sueldoBase: 780_000 },
    { nombre: "Administrativo", clase: "administrativo", sueldoBase: 900_000 },
  ],
  outsourcing: [
    { nombre: "Colaborador", clase: "operativo", sueldoBase: 560_000 },
    { nombre: "Supervisor", clase: "operativo", sueldoBase: 820_000 },
    { nombre: "Administrativo", clase: "administrativo", sueldoBase: 900_000 },
  ],
  mantenimiento: [
    { nombre: "Técnico", clase: "operativo", sueldoBase: 750_000 },
    { nombre: "Jefe de cuadrilla", clase: "operativo", sueldoBase: 1_050_000 },
    { nombre: "Administrativo", clase: "administrativo", sueldoBase: 900_000 },
  ],
};

export type CapaDocumento = "empresa" | "cuenta" | "instalacion" | "persona" | "puesto";

export type TipoDocumentoBase = {
  codigo: string;
  nombre: string;
  capa: CapaDocumento;
  obligatorio?: boolean;
  tieneVencimiento?: boolean;
  normativa?: string;
  mimesPermitidos?: readonly string[];
};

const IMAGENES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;

/** Tipos de documento base (todas las verticales). OS-10 solo aplica a seguridad. */
export function tiposDocumentoBase(vertical: Vertical): TipoDocumentoBase[] {
  const seguridad = vertical === "seguridad";
  return [
    ...(seguridad
      ? [
          {
            codigo: "os10_empresa",
            nombre: "Autorización OS-10 de la empresa",
            capa: "empresa" as const,
            tieneVencimiento: true,
            normativa: "D.S. 93",
          },
        ]
      : []),
    { codigo: "patente", nombre: "Patente municipal", capa: "empresa", tieneVencimiento: true },
    {
      codigo: "seguro_rc",
      nombre: "Seguro de responsabilidad civil",
      capa: "empresa",
      tieneVencimiento: true,
    },
    {
      codigo: "marca.logo",
      nombre: "Logo de la marca",
      capa: "empresa",
      mimesPermitidos: IMAGENES,
    },
    {
      codigo: "marca.favicon",
      nombre: "Favicon de la marca",
      capa: "empresa",
      mimesPermitidos: IMAGENES,
    },
    {
      codigo: "contrato_servicio",
      nombre: "Contrato de servicio",
      capa: "cuenta",
      tieneVencimiento: true,
    },
    { codigo: "orden_compra", nombre: "Orden de compra", capa: "cuenta" },
    { codigo: "protocolo", nombre: "Protocolo de la instalación", capa: "instalacion" },
    { codigo: "plano", nombre: "Plano", capa: "instalacion" },
    {
      codigo: "autorizacion",
      nombre: "Autorización de la instalación",
      capa: "instalacion",
      tieneVencimiento: true,
    },
    {
      codigo: "cedula",
      nombre: "Cédula de identidad",
      capa: "persona",
      obligatorio: true,
      tieneVencimiento: true,
    },
    {
      codigo: "contrato_laboral",
      nombre: "Contrato de trabajo",
      capa: "persona",
      obligatorio: true,
    },
    ...(seguridad
      ? [
          {
            codigo: "os10",
            nombre: "Credencial OS-10",
            capa: "persona" as const,
            obligatorio: true,
            tieneVencimiento: true,
            normativa: "D.S. 93 Art. 13",
          },
          {
            codigo: "os10_curso",
            nombre: "Certificado de curso OS-10",
            capa: "persona" as const,
            obligatorio: true,
            tieneVencimiento: true,
            normativa: "D.S. 93",
          },
        ]
      : []),
    {
      codigo: "antecedentes",
      nombre: "Certificado de antecedentes",
      capa: "persona",
      obligatorio: true,
      tieneVencimiento: true,
    },
    {
      codigo: "examen_preocupacional",
      nombre: "Examen preocupacional",
      capa: "persona",
      tieneVencimiento: true,
    },
    { codigo: "foto", nombre: "Fotografía", capa: "persona", mimesPermitidos: IMAGENES },
    { codigo: "descripcion_puesto", nombre: "Descripción del puesto", capa: "puesto" },
  ];
}
