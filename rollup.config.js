import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import dts from "rollup-plugin-dts";

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
    plugins: [
      typescript(),
      nodeResolve({ browser: false }),
      commonjs(),
      json(),
    ],
  },
  {
    input: "dist/types/index.d.ts",
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "~/*": ["src/*"],
          },
        },
      }),
    ],
    output: [
      {
        format: "es",
        file: "dist/index.d.ts",
      },
    ],
  },
];
