// Adaptadores del núcleo (ADR-008, ADR-027, ADR-031): correo, almacenamiento, geolocalización, IA y
// secretos por tenant. Nunca SDKs de proveedores: todo por HTTP y medido por el núcleo.
export * from "./almacenamiento/r2";
export * from "./biometria";
export * from "./catalogo";
export * from "./email";
export * from "./firma";
export * from "./biometria";
export * from "./sii";
export * from "./slack";
export * from "./cesion";
export * from "./dte/pdf";
export * from "./geo/google";
export * from "./ia/proveedores";
export * from "./secretos/cifrado";
