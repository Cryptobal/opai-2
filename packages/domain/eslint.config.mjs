import { baseConfig, domainConfig } from "../../eslint.base.mjs";

export default [...baseConfig, { ...domainConfig, files: ["src/**/*.ts"] }];
