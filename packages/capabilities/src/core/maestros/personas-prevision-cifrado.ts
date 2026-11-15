/**
 * Campos de la previsión que se guardan cifrados con la DEK de la empresa (Ley 21.719: datos de salud). La clave es el
 * campo de la capacidad y el valor, la columna (el AAD del cifrado). CAR-411 suma el tipo de pensión y la discapacidad
 * al plan ISAPRE; la base exige que esas dos columnas estén cifradas (`personas_prevision_salud_cifrada`).
 */
export const CAMPOS_CIFRADOS = {
  planIsapre: "plan_isapre",
  tipoPension: "tipo_pension",
  discapacidadInvalidez: "discapacidad_invalidez",
} as const;
