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
