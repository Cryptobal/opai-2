import { baseConfig } from "../../eslint.base.mjs";

// Los proyectos nativos (Xcode y Gradle) los genera Capacitor: no se lintean.
export default [...baseConfig, { ignores: ["nativo/**", "www/**"] }];
