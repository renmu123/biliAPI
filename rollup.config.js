import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import dts from "rollup-plugin-dts";
import alias from "@rollup/plugin-alias";

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
    input: "src/index.ts",
    plugins: [
      typescript(),
      nodeResolve(),
      commonjs(),
      alias({
        entries: [{ find: "~", replacement: "./src" }],
      }),
      dts(),
    ],
    output: {
      format: "esm",
      file: "dist/index.d.ts",
    },
  },
];
