import path from "node:path";

import PQueue from "p-queue";
import { getFileSize, readBytesFromFile } from "~/utils/index.ts";

import type { Request } from "~/types/index.d.ts";

export class WebVideoUploader {
  request: Request;
  queue: PQueue;

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
  async _uploadChunk(options: {
    filePath: string;
    start: number;
    chunk_size: number;
    size: number;
    auth: string;
    url: string;
    uploadId: string;
    chunk: number;
    chunks: number;
  }) {
    const {
      filePath,
      start,
      chunk_size,
      size,
      auth,
      url,
      uploadId,
      chunk,
      chunks,
    } = options;
    const chunkData = await readBytesFromFile(
      filePath,
      start,
      chunk_size,
      size
    );

    const params = {
      uploadId: uploadId,
      partNumber: chunk + 1,
      chunk: chunk,
      chunks: chunks,
      size: chunkData.length,
      start: start,
      end: start + chunkData.length,
      total: size,
    };
    const res = await this.request.put(url, chunkData, {
      params: params,
      headers: {
        "X-Upos-Auth": auth,
      },
    });
    return params;
  }

  uploadChunk(
    filePath: string,
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number,
    size: number
  ) {
    return new Promise((resolve, reject) => {
      const queue = new PQueue({ concurrency: 3 });
      this.queue = queue;

      const chunks = Math.ceil(size / chunk_size);
      const numberOfChunks = Math.ceil(size / chunk_size);
      const chunkParams = [];
      for (let i = 0; i < numberOfChunks; i++) {
        const start = i * chunk_size;
        chunkParams.push({
          filePath: filePath,
          start: start,
          chunk_size: chunk_size,
          size: size,
          auth: auth,
          url: url,
          uploadId,
          chunks,
          chunk: i,
        });
      }

      chunkParams.map(params => {
        return queue.add(() => this._uploadChunk(params));
      });

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];

      queue.addListener("completed", ({ partNumber }) => {
        console.log(`Part #${partNumber} uploaded!`);
        parts.push({ partNumber, eTag: "etag" });
      });

      queue.on("idle", () => {
        console.log("All done!");
        resolve(parts);
      });
    });
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

    const start = Date.now();
    const parts = await this.uploadChunk(
      filePath,
      url,
      auth,
      uploadInfo.upload_id,
      chunk_size,
      size
    );
    console.log("duration", Date.now() - start);

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
