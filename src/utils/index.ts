import fs from "fs";

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
) {
  return new Promise((resolve, reject) => {
    const endByte = Math.min(start + numBytes - 1, totalBytes - 1);

    const readStream = fs.createReadStream(filePath, { start, end: endByte });
    let data = "";

    readStream.on("data", chunk => {
      data += chunk;
    });

    readStream.on("end", () => {
      resolve(data);
    });

    readStream.on("error", err => {
      reject(`Error reading file: ${err.message}`);
    });
  });
}
