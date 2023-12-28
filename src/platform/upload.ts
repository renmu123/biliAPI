import path from "node:path";
import EventEmitter from "events";

import PQueue from "p-queue";
import { getFileSize, readBytesFromFile, sum } from "../utils/index";

import type { Request, MediaPartOptions } from "../types/index";

interface UploadChunkTask {
  filePath: string;
  start: number;
  chunk_size: number;
  size: number;
  auth: string;
  url: string;
  uploadId: string;
  chunk: number;
  chunks: number;
  controller: AbortController;
  status?: "pending" | "completed" | "running" | "error" | "abort";
}

export class WebVideoUploader {
  request: Request;
  queue: PQueue;
  emitter = new EventEmitter();
  progress: { [key: string]: number } = {};
  chunkTasks: {
    [key: number]: UploadChunkTask;
  } = {};
  size: number = 0;

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
  async _uploadChunk(options: UploadChunkTask) {
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
    this.chunkTasks[params.partNumber].status = "running";
    try {
      const res = await this.request.put(url, chunkData, {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
        signal: options.controller.signal,
        onUploadProgress: (progressEvent: any) => {
          this.progress[params.partNumber] = progressEvent.loaded;
          const progress = sum(Object.values(this.progress));
          this.emitter.emit("progress", {
            event: `uploading`,
            progress: progress / size,
            data: {
              loaded: progress,
              total: size,
            },
          });
        },
      });
      return params;
    } catch (e) {
      console.log(e.name);
      if (e.name == "CanceledError") {
        this.chunkTasks[params.partNumber].status = "abort";
        // console.log("upload abort", e);
      } else {
        this.chunkTasks[params.partNumber].status = "error";
        // console.error("upload error", e);
        throw e;
      }
    }
  }

  uploadChunk(
    filePath: string,
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number,
    size: number
  ): Promise<{ partNumber: number; eTag: "etag" }[]> {
    return new Promise((resolve, reject) => {
      const queue = new PQueue({ concurrency: 3 });
      this.queue = queue;

      const chunks = Math.ceil(size / chunk_size);
      const numberOfChunks = Math.ceil(size / chunk_size);
      const chunkParams: UploadChunkTask[] = [];
      for (let i = 0; i < numberOfChunks; i++) {
        const start = i * chunk_size;
        const controller = new AbortController();
        const partNumber = i + 1;
        const data: UploadChunkTask = {
          filePath: filePath,
          start: start,
          chunk_size: chunk_size,
          size: size,
          auth: auth,
          url: url,
          uploadId,
          chunks,
          chunk: i,
          status: "pending",
          controller: controller,
        };
        chunkParams.push(data);
        this.chunkTasks[partNumber] = data;
      }

      chunkParams.map(params => {
        return queue.add(() => this._uploadChunk(params));
      });

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];
      queue.addListener("completed", ({ partNumber }) => {
        this.chunkTasks[partNumber].status = "completed";
        parts.push({ partNumber, eTag: "etag" });
      });

      queue.on("idle", () => {
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
    // console.log("mergeVideo", res);
    return res;
  }

  sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  async upload(part: MediaPartOptions) {
    this.progress = {};
    const filePath = part.path;
    const title = part.title || path.parse(filePath).name;
    const size = await getFileSize(filePath);
    this.size = size;

    this.emitter.emit("progress", {
      event: "preuplad-start",
      progress: 0,
    });
    const data = await this.preupload(filePath, size);
    this.emitter.emit("progress", {
      event: "preuplad-end",
      progress: 0,
    });

    const { endpoint, upos_uri, biz_id, chunk_size, auth } = data;
    const url = `https:${endpoint}/${upos_uri.replace("upos://", "")}`;

    this.emitter.emit("progress", {
      event: "getUploadInfo-start",
      progress: 0,
    });
    const uploadInfo = await this.getUploadInfo(
      url,
      biz_id,
      chunk_size,
      auth,
      size
    );
    this.emitter.emit("progress", {
      event: "getUploadInfo-end",
      progress: 0,
      data: uploadInfo,
    });
    // console.log("uploadInfo", uploadInfo);

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
    this.emitter.emit("progress", {
      event: "merge-start",
      progress: 1,
      data: params,
    });
    let attempt = 0;
    while (attempt < 5) {
      const res = await this.mergeVideo(url, params, parts, auth);
      if (res.OK !== 1) {
        attempt += 1;
        console.error("合并视频失败，等待重试");
        await this.sleep(10000);
      } else {
        break;
      }
    }
    if (attempt >= 5) throw new Error("合并视频失败");
    this.emitter.emit("progress", {
      event: "merge-end",
      progress: 1,
      data: params,
    });
    console.log(this.chunkTasks);
    this.emitter.emit("completed", {
      cid: biz_id,
      filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
      title: title,
    });

    return {
      cid: biz_id,
      filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
      title: title,
    };
  }
  pause() {
    this.queue.pause();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
  }
  start() {
    const abortTasks = Object.values(this.chunkTasks).filter(
      task => task.status == "abort"
    );
    abortTasks.map(task => {
      task.controller = new AbortController();
      task.status = "pending";
      this.queue.add(() => {
        this._uploadChunk(task);
      });
    });
    this.queue.start();
    console.log("开始上传", this.chunkTasks, this.queue.size);
  }
  cancel() {
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
    this.queue.clear();
  }
  on(event: "start" | "completed" | "progress", callback: () => void) {
    this.emitter.on(event, callback);
    // progress callback(event: 'preuplad-start'|'preuplad-end'|'merge-start'|'merge-end'|'getUploadInfo-end'|'getUploadInfo-start',progress:number)
  }
  once(event: "start" | "completed" | "progress", callback: () => void) {
    this.emitter.once(event, callback);
  }
  off(event: "start" | "completed" | "progress", callback: () => void) {
    this.emitter.off(event, callback);
  }
}
