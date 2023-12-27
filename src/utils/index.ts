import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export async function getFileSize(filePath: string) {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

export let isString = (value: unknown) =>
  typeof value === "string" || value instanceof String;

export function readBytesFromFile(
  filePath: string,
  start: number,
  numBytes: number,
  totalBytes: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const endByte = Math.min(start + numBytes - 1, totalBytes - 1);

    const readStream = fs.createReadStream(filePath, { start, end: endByte });
    let data: Buffer[] = [];

    readStream.on("data", chunk => {
      data.push(chunk as Buffer);
    });

    readStream.on("end", () => {
      resolve(Buffer.concat(data));
    });

    readStream.on("error", err => {
      reject(`Error reading file: ${err.message}`);
    });
  });
}

export async function readFileAsBase64(filePath: string) {
  return fs.promises
    .readFile(filePath)
    .then(data => {
      // 获取文件扩展名
      const extname = path.extname(filePath).toLowerCase();

      // 根据文件类型添加Base64编码的数据头部
      let base64Data = "";
      if (extname === ".jpg" || extname === ".jpeg") {
        base64Data = "data:image/jpeg;base64," + data.toString("base64");
      } else if (extname === ".png") {
        base64Data = "data:image/png;base64," + data.toString("base64");
      } else if (extname === ".gif") {
        base64Data = "data:image/gif;base64," + data.toString("base64");
      } else {
        base64Data =
          "data:application/octet-stream;base64," + data.toString("base64");
      }

      return base64Data;
    })
    .catch(err => {
      throw err;
    });
}

export function md5(data: any) {
  const md5Hash = crypto.createHash("md5");
  md5Hash.update(data);
  return md5Hash.digest("hex");
}

export function fakeBuvid3() {
  // 57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc
  function randomStr() {
    const str = "0123456789abcdef";
    return str[Math.floor(Math.random() * str.length)].toUpperCase();
  }
  let str = `${Array.from({ length: 8 }, () => randomStr()).join(
    ""
  )}-${Array.from({ length: 4 }, () => randomStr()).join("")}-${Array.from(
    { length: 4 },
    () => randomStr()
  ).join("")}-${Array.from({ length: 4 }, () => randomStr()).join(
    ""
  )}-${Array.from({ length: 17 }, () => randomStr()).join("")}`;
  return str + "infoc";
}

export function sum(arr: number[]) {
  return arr.reduce((prev, curr) => prev + curr, 0);
}
