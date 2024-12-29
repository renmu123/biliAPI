import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import type { SpawnOptionsWithoutStdio } from "node:child_process";

export async function getFileSize(filePath: string) {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

export let isString = (value: unknown) => typeof value === "string";

export function readBytesFromFile(
  filePath: string,
  start: number,
  numBytes: number,
  totalBytes: number
): [fs.ReadStream, number] {
  const endByte = Math.min(start + numBytes - 1, totalBytes - 1);

  const readStream = fs.createReadStream(filePath, { start, end: endByte });
  return [readStream, endByte - start + 1];
}

export async function streamToBuffer(stream: fs.ReadStream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
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
export const btoa = function (str: string) {
  var s = Buffer.from(str).toString("base64");
  return s;
};

export const uuid = function () {
  var s = [];
  var hexDigits = "0123456789abcdef";
  for (var i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
  // @ts-ignore
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01

  // @ts-ignore
  s[8] = s[13] = s[18] = s[23] = "-";

  var uuid = s.join("");
  return uuid;
};

/**
 * 生成dm_cover_img_str
 * @param str 比如：ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0XX)), SwiftShader driver)Google Inc. (Google)
 */
export function fakeDmCoverImgStr(str: string) {
  var e = new TextEncoder().encode(str).buffer,
    n = new Uint8Array(e),
    r = btoa(String.fromCharCode.apply(null, n));
  return r.substring(0, r.length - 2);
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

export async function spawnChild(
  command: string,
  args?: readonly string[],
  options?: SpawnOptionsWithoutStdio
) {
  const child = spawn(command, args, options);

  let data = "";
  for await (const chunk of child.stdout) {
    data += chunk;
  }
  let error = "";
  for await (const chunk of child.stderr) {
    error += chunk;
  }
  const exitCode = await new Promise((resolve, reject) => {
    child.on("close", resolve);
  });

  if (exitCode) {
    throw new Error(`subprocess error exit ${exitCode}, ${error}`);
  }
  return data;
}

/**
 * 重试函数
 * @param fn 要重试的函数
 * @param times 重试次数
 * @param delay 重试间隔时间
 */
export function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    function attempt(currentTimes: number) {
      fn()
        .then(resolve)
        .catch(err => {
          setTimeout(() => {
            if (currentTimes === 1) {
              reject(err);
            } else {
              attempt(currentTimes - 1);
            }
          }, delay);
        });
    }
    attempt(times);
  });
}
