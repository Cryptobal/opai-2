import { baseConfig, domainConfig, soloComponentesDelDs } from "../../eslint.base.mjs";

export default [...baseConfig, domainConfig, { files: ["ui/**/*.tsx"], ...soloComponentesDelDs }];
