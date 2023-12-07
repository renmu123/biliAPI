import path from "path";
import fs from "fs";
import { getFileSize, readBytesFromFile } from "~/utils/index.ts";

import type { Request } from "~/types/index.d.ts";

export class WebVideoUploader {
  request: Request;

  constructor(request: Request) {
    this.request = request;
  }

  async preupload(
    filePath: string,
    size: number
  ): Promise<{
    OK: number;
    auth: string;
    biz_id: number;
    chunk_retry: number;
    chunk_retry_delay: number;
    chunk_size: number;
    endpoint: string;
    endpoints: string[];
    expose_params: any;
    put_query: string;
    threads: number;
    timeout: number;
    uip: string;
    upos_uri: string;
  }> {
    const { base } = path.parse(filePath);
    return this.request.get("https://member.bilibili.com/preupload", {
      params: {
        zone: "cs",
        upcdn: "bldsa",
        probe_version: "20221109",
        name: base,
        r: "upos",
        profile: "ugcfx/bup",
        ssl: "0",
        version: "",
        build: "2140000",
        size: size,
        webVersion: "2.14.0",
      },
    });
  }

  async getUploadInfo(
    url: string,
    biz_id: number,
    chunk_size: number,
    auth: string,
    size: number
  ): Promise<{
    OK: number;
    bucket: string;
    key: string;
    upload_id: string;
  }> {
    return this.request.post(url, "", {
      params: {
        uploads: "",
        output: "json",
        profile: "ugcfx/bup",
        filesize: size,
        partsize: chunk_size,
        biz_id: biz_id,
      },
      headers: {
        "X-Upos-Auth": auth,
      },
    });
  }

  async uploadChunk(
    filePath: string,
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number,
    size: number
  ) {
    const chunks = Math.ceil(size / chunk_size);

    const data = await fs.promises.readFile(filePath);
    const numberOfChunks = Math.ceil(size / chunk_size);
    const parts: {
      partNumber: number;
      eTag: "etag";
    }[] = [];
    for (let i = 0; i < numberOfChunks; i++) {
      const start = i * chunk_size;
      const chunkData = await readBytesFromFile(
        filePath,
        start,
        chunk_size,
        size
      );
      console.log("chunkData", chunkData);

      const params = {
        uploadId: uploadId,
        partNumber: i + 1,
        chunk: i,
        chunks: chunks,
        size: chunkData.length,
        start: start,
        end: start + chunkData.length,
        total: size,
      };
      console.log("params", params);

      const res = await this.request.put(url, chunkData, {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
      });
      console.log("chunk data", res.data);
      parts.push({ partNumber: i + 1, eTag: "etag" });
    }

    return parts;
  }

  async mergeVideo(url: string, params: any, parts: any, auth: string) {
    const res = await this.request.post<
      never,
      {
        OK: number;
        bucket: string;
        etag: string;
        key: string;
        location: string;
      }
    >(
      url,
      {},
      {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
      }
    );
    console.log("mergeVideo", res);
    return res;
  }

  sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  async upload(filePath: string) {
    const { name: title } = path.parse(filePath);
    const size = await getFileSize(filePath);

    const data = await this.preupload(filePath, size);
    console.log("preupload", data);

    const { endpoint, upos_uri, biz_id, chunk_size, auth } = data;
    const url = `https:${endpoint}/${upos_uri.replace("upos://", "")}`;
    console.log("url", url);

    const uploadInfo = await this.getUploadInfo(
      url,
      biz_id,
      chunk_size,
      auth,
      size
    );
    console.log("uploadInfo", uploadInfo);

    const parts = await this.uploadChunk(
      filePath,
      url,
      auth,
      uploadInfo.upload_id,
      chunk_size,
      size
    );

    const params = {
      name: title,
      uploadId: uploadInfo.upload_id,
      biz_id: biz_id,
      output: "json",
      profile: "ugcupos/bup",
    };
    let attempt = 0;
    while (attempt < 5) {
      const res = await this.mergeVideo(url, params, parts, auth);
      if (res.OK !== 1) {
        attempt += 1;
        console.log("合并视频失败，等待重试");
        await this.sleep(10000);
      } else {
        break;
      }
    }
    if (attempt >= 5) throw new Error("合并视频失败");

    return {
      cid: biz_id,
      filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
      title: title,
    };
  }
}
