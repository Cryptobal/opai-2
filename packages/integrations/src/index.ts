// Adaptadores de integración configurables por tenant (ADR-008): DTE, banco, factoring,
// mensajería, biometría. Cada adaptador implementa una interfaz del núcleo y se elige por tenant.
// Brief 01: correo transaccional del núcleo.
export * from "./email";
