import type { Request, CommonResponse } from "~/types";
import path from "path";
import fs from "fs";

// {
//   "OK": 1,
//   "auth": "ak=1494471752\u0026cdn=%2F%2Fupos-cs-upcdnbldsa.bilivideo.com\u0026os=upos\u0026sign=413e9a9ad5f12f22932f42bde213578f\u0026timestamp=1699885603.815\u0026uid=10995238\u0026uip=101.88.178.236\u0026uport=6908\u0026use_dqp=0",
//   "biz_id": 1331321717,
//   "chunk_retry": 10,
//   "chunk_retry_delay": 3,
//   "chunk_size": 10485760,
//   "endpoint": "//upos-cs-upcdnbldsa.bilivideo.com",
//   "endpoints": [
//       "//upos-cs-upcdnbldsa.bilivideo.com",
//       "//upos-cs-upcdnqn.bilivideo.com",
//       "//upos-cs-upcdnbda2.bilivideo.com"
//   ],
//   "expose_params": null,
//   "put_query": "os=upos\u0026profile=ugcfx%2Fbup",
//   "threads": 3,
//   "timeout": 1200,
//   "uip": "101.88.178.236",
//   "upos_uri": "upos://ugcfx2lf/n231113sa10t9rub2135fw30ykhm7zcm.mp4"
// }
export const preupload = async (request: Request, filePath: string) => {
  const { base } = path.parse(filePath);
  const size = await getFileSize(filePath);
  return request.get("https://member.bilibili.com/preupload", {
    params: {
      zone: "cs",
      upcdn: "bldsa",
      probe_version: "20221109",
      name: base,
      r: "upos",
      profile: "ugcfx/bup",
      ssl: "0",
      version: "2.14.0.0",
      build: "2140000",
      size: size,
      webVersion: "2.14.0",
    },
  });
};

// {
//   "OK": 1,
//   "auth": "ak=1494471752\u0026cdn=%2F%2Fupos-cs-upcdnqn.bilivideo.com\u0026os=upos\u0026sign=aaf052bb1e44d3559b4a6f9a7b96177e\u0026timestamp=1699885603.990\u0026uid=10995238\u0026uip=101.88.178.236\u0026uport=6908\u0026use_dqp=0",
//   "biz_id": 0,
//   "chunk_retry": 10,
//   "chunk_retry_delay": 3,
//   "chunk_size": 10485760,
//   "endpoint": "//upos-cs-upcdnqn.bilivideo.com",
//   "endpoints": [
//       "//upos-cs-upcdnqn.bilivideo.com",
//       "//upos-cs-upcdnbda2.bilivideo.com"
//   ],
//   "expose_params": null,
//   "put_query": "os=upos\u0026profile=fxmeta%2Fbup",
//   "threads": 5,
//   "timeout": 1200,
//   "uip": "101.88.178.236",
//   "upos_uri": "upos://fxmetalf/n231113qnhpn2ehlcuf45299b4qk23ut.txt"
// }
export const preuploadMeta = async (
  request: Request
): Promise<
  CommonResponse<{
    OK: number;
    auth: string;
    biz_id: number;
    chunk_retry: number;
    chunk_retry_delay: number;
    chunk_size: number;
    end_point: string;
    end_points: string[];
    expose_params: any;
    put_query: string;
    threads: number;
    timeout: number;
    uip: string;
    upos_uri: string;
  }>
> => {
  return request.get("https://member.bilibili.com/preupload", {
    params: {
      name: "file_meta.txt",
      size: 2000,
      r: "upos",
      profile: "fxmeta/bup",
      ssl: "0",
      version: "2.14.0.0",
      build: "2140000",
      webVersion: "2.14.0",
    },
  });
};

async function getFileSize(filePath: string) {
  try {
    const stats = await fs.promises.stat(filePath);
    // 获取文件大小（以字节为单位）
    const fileSizeInBytes = stats.size;
    // 将文件大小转换为其他单位（如KB、MB、GB等）
    const fileSizeInKB = fileSizeInBytes / 1024;
    // const fileSizeInMB = fileSizeInKB / 1024;
    // const fileSizeInGB = fileSizeInMB / 1024;

    // console.log("File Size (Bytes):", fileSizeInBytes);
    // console.log("File Size (KB):", fileSizeInKB);
    // console.log("File Size (MB):", fileSizeInMB);
    // console.log("File Size (GB):", fileSizeInGB);
    return fileSizeInKB;
  } catch (err) {
    console.error("Error reading file:", err);
  }
}
