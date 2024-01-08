import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.mjs",
        format: "es",
        exports: "named",
      },
      {
        file: "dist/index.cjs",
        format: "cjs",
      },
    ],
    // external: ["axios", "p-queue", "axios-retry"],
    plugins: [
      typescript(),
      nodeResolve({ browser: false }),
      commonjs(),
      json(),
    ],
  },
];
