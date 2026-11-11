// Importador de personas (CAR-282): qué columnas acepta la planilla y cómo se leen. La ficha, la
// previsión y la cuenta bancaria viajan en una sola fila por persona; el RUT es la clave.
import { codigoSbif, tipoCuentaCanonico } from "@opai/domain";
import type { DefinicionImportador, FilaNormalizada } from "@opai/domain/importacion";

import { CAMPO_ID_EXTERNO, fecha, texto } from "./comun";

export type DatosPersona = {
  nombres: string;
  apellidos: string;
  rut: string;
  emailPersonal: string | null;
  emailLaboral: string | null;
  telefono: string | null;
  fechaNacimiento: Date | null;
  sexo: string | null;
  nacionalidad: string | null;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  afp: string | null;
  regimen: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
};

export const CAMPOS_PREVISION = ["afp", "regimen", "sistemaSalud", "isapreNombre"] as const;
export const CAMPOS_PAGO = ["bancoCodigo", "tipoCuenta", "numeroCuenta"] as const;
export const CAMPOS_FICHA = [
  "emailPersonal",
  "emailLaboral",
  "telefono",
  "fechaNacimiento",
  "sexo",
  "nacionalidad",
  "calle",
  "comuna",
  "region",
] as const;

const t = (clave: string, etiqueta: string, sinonimos: string[], ejemplo: string, largoMaximo = 120) =>
  ({ clave, etiqueta, tipo: "texto", sinonimos, ejemplo, largoMaximo }) as const;

export const defPersonas: DefinicionImportador = {
  id: "personas",
  etiqueta: "Personas",
  descripcion:
    "Trabajadores y guardias con su ficha, previsión y cuenta bancaria. Se reconocen por RUT: reimportar no crea una segunda ficha.",
  campos: [
    CAMPO_ID_EXTERNO,
    { ...t("nombres", "Nombres", ["nombre", "firstName", "first name"], "Ana María"), requerido: true },
    { ...t("apellidos", "Apellidos", ["apellido", "lastName", "last name"], "Soto Pérez"), requerido: true },
    { clave: "rut", etiqueta: "RUT", tipo: "rut", requerido: true, sinonimos: ["rut trabajador", "rut guardia", "run"], ejemplo: "11.111.111-1" },
    { clave: "email_personal", etiqueta: "Correo personal", tipo: "email", sinonimos: ["email", "correo", "mail"], ejemplo: "ana@correo.cl" },
    { clave: "email_laboral", etiqueta: "Correo laboral", tipo: "email", sinonimos: ["correo empresa"], ejemplo: "" },
    { clave: "telefono", etiqueta: "Teléfono", tipo: "telefono", sinonimos: ["celular", "phone", "movil", "móvil"], ejemplo: "+56 9 1234 5678" },
    { clave: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha", sinonimos: ["nacimiento", "birthDate", "fecha nac"], ejemplo: "15-04-1990" },
    {
      clave: "sexo", etiqueta: "Sexo", tipo: "opcion", sinonimos: ["genero", "género", "gender"], ejemplo: "femenino",
      opciones: { femenino: ["f", "mujer", "female", "femenino"], masculino: ["m", "hombre", "male", "masculino"], otro: ["otro", "other"], no_declara: ["no declara", "nd"] },
    },
    { ...t("nacionalidad", "Nacionalidad (código de país)", ["pais", "país", "nationality"], "CL", 2), ayuda: "Dos letras: CL, PE, VE, CO…" },
    t("calle", "Dirección", ["direccion", "address", "domicilio"], "Av. Matta 123", 200),
    t("comuna", "Comuna", ["commune"], "Santiago", 80),
    t("region", "Región", [], "Metropolitana", 80),
    t("afp", "AFP", ["afp nombre", "fondo de pensiones"], "Habitat", 80),
    t("regimen", "Régimen previsional", ["regimen", "régimen"], "AFP", 80),
    {
      clave: "sistema_salud", etiqueta: "Sistema de salud", tipo: "opcion", sinonimos: ["salud", "healthSystem", "prevision salud"], ejemplo: "fonasa",
      opciones: { fonasa: ["fonasa"], isapre: ["isapre"] },
    },
    t("isapre", "Isapre", ["isapre nombre", "nombre isapre"], "", 120),
    { ...t("banco", "Banco", ["banco nombre", "bank", "codigo banco", "código banco"], "BancoEstado"), ayuda: "Nombre del banco o su código SBIF de 3 dígitos." },
    { ...t("tipo_cuenta", "Tipo de cuenta", ["tipo de cuenta", "accountType"], "vista", 40), ayuda: "Corriente, vista, RUT o ahorro." },
    t("numero_cuenta", "Número de cuenta", ["cuenta", "n cuenta", "nro cuenta", "accountNumber", "cuenta bancaria"], "12345678", 40),
  ],
};

/** Fila de la planilla → datos de la persona. El banco y el tipo de cuenta quedan en su forma del catálogo. */
export function datosDePersona(f: FilaNormalizada): DatosPersona {
  const d = (k: string) => texto(f.datos[k]);
  return {
    nombres: d("nombres") ?? "",
    apellidos: d("apellidos") ?? "",
    rut: d("rut") ?? "",
    emailPersonal: d("email_personal"),
    emailLaboral: d("email_laboral"),
    telefono: d("telefono"),
    fechaNacimiento: fecha(f.datos["fecha_nacimiento"]),
    sexo: d("sexo"),
    nacionalidad: d("nacionalidad")?.toUpperCase() ?? null,
    calle: d("calle"),
    comuna: d("comuna"),
    region: d("region"),
    afp: d("afp"),
    regimen: d("regimen"),
    sistemaSalud: d("sistema_salud"),
    isapreNombre: d("isapre"),
    bancoCodigo: codigoSbif(d("banco")),
    tipoCuenta: tipoCuentaCanonico(d("tipo_cuenta")),
    numeroCuenta: d("numero_cuenta")?.replace(/[\s.]/g, "") ?? null,
  };
}

/** Errores de la fila en lenguaje claro; vacío si se puede importar. */
export function erroresDePersona(f: FilaNormalizada, d: DatosPersona): string[] {
  const e: string[] = [];
  if (d.nacionalidad && !/^[A-Z]{2}$/.test(d.nacionalidad))
    e.push("La nacionalidad va como código de país de dos letras (CL, PE, VE…).");
  if (d.sistemaSalud === "isapre" && !d.isapreNombre)
    e.push("Previsión incompleta: el sistema de salud es isapre y falta el nombre de la isapre.");
  const banco = texto(f.datos["banco"]);
  const tipo = texto(f.datos["tipo_cuenta"]);
  if (banco && !d.bancoCodigo) e.push(`No se reconoce el banco «${banco}»: usa su nombre o su código SBIF.`);
  if (tipo && !d.tipoCuenta) e.push(`No se reconoce el tipo de cuenta «${tipo}»: corriente, vista, RUT o ahorro.`);
  const dados = [banco, tipo, d.numeroCuenta].filter(Boolean).length;
  if (dados > 0 && dados < 3) e.push("Cuenta bancaria incompleta: indica banco, tipo de cuenta y número.");
  if (d.numeroCuenta && !/^[0-9-]{4,40}$/.test(d.numeroCuenta))
    e.push("Cuenta bancaria mal formada: el número solo lleva dígitos y guiones (mínimo 4).");
  return e;
}
