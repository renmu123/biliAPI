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
