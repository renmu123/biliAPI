import fs from "fs";
import path from "path";

const copy = (src, dest) => {
  fs.copyFileSync(src, dest);
};
