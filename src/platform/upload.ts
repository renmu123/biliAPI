import path from "node:path";
import EventEmitter from "node:events";

import PQueue from "p-queue";
import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";
import { getFileSize, readBytesFromFile, sum, retry } from "../utils/index";

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

export class WebVideoUploader extends BaseRequest {
  queue: PQueue;
  emitter = new EventEmitter();
  progress: { [key: string]: number } = {};
  chunkTasks: {
    [key: number]: UploadChunkTask;
  } = {};
  size: number = 0;
  options: {
    concurrency: number;
    retryTimes: number;
    retryDelay: number;
  };

  constructor(
    auth: Auth = new Auth(),
    options: {
      concurrency?: number;
      retryTimes?: number;
      retryDelay?: number;
    } = {}
  ) {
    super(auth);
    this.options = Object.assign(
      {
        concurrency: 3,
        retryTimes: 3,
        retryDelay: 3000,
      },
      options
    );
  }

  async preuploadApi(
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
    const res = await this.request.get(
      "https://member.bilibili.com/preupload",
      {
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
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
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
    const res = await this.request.post(url, "", {
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
      extra: {
        rawResponse: true,
      },
    });
    return res.data;
  }
  async _uploadChunk(options: UploadChunkTask, retryCount = 2) {
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
        extra: {
          rawResponse: true,
        },
        timeout: 1000000,
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
      console.error("upload error", e.code);
      if (e.code == "ERR_CANCELED") {
        this.chunkTasks[params.partNumber].status = "abort";
      } else if (
        e.code === "ECONNABORTED" ||
        e.code === "ERR_BAD_RESPONSE" ||
        e.code === "ERR_BAD_REQUEST" ||
        e.code === "ETIMEDOUT"
      ) {
        if (retryCount > 0) {
          await this.sleep(1000);
          this._uploadChunk(options, retryCount - 1);
        } else {
          this.chunkTasks[params.partNumber].status = "error";
          throw e;
        }
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
      const queue = new PQueue({ concurrency: this.options.concurrency });
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
      // console.log("chunkParams", chunkParams.length);
      chunkParams.map(params => {
        return queue.add(() => this._uploadChunk(params));
      });

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];
      queue.addListener("completed", ({ partNumber }) => {
        // console.log("completed", partNumber);
        this.chunkTasks[partNumber].status = "completed";
        parts.push({ partNumber, eTag: "etag" });
      });

      queue.on("idle", () => {
        // console.log("idle", parts.length, chunkParams.length);
        if (parts.length === chunkParams.length) {
          resolve(parts);
        } else {
          reject("上传失败");
        }
      });
    });
  }

  async mergeVideoApi(
    url: string,
    params: any,
    auth: string
  ): Promise<{
    OK: number;
    bucket: string;
    etag: string;
    key: string;
    location: string;
  }> {
    const res = await this.request.post(
      url,
      {},
      {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
  }

  sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  async upload(part: MediaPartOptions) {
    this.progress = {};
    const filePath = part.path;
    const title = part.title || path.parse(filePath).name;
    const size = await getFileSize(filePath);
    this.size = size;

    this.emitter.emit("progress", {
      event: "preupload-start",
      progress: 0,
    });
    const data = await retry(
      () => this.preuploadApi(filePath, size),
      this.options.retryTimes,
      this.options.retryDelay
    );
    this.emitter.emit("progress", {
      event: "preupload-end",
      progress: 0,
    });

    const { endpoint, upos_uri, biz_id, chunk_size, auth } = data;
    const url = `https:${endpoint}/${upos_uri.replace("upos://", "")}`;

    this.emitter.emit("progress", {
      event: "getUploadInfo-start",
      progress: 0,
    });
    const uploadInfo = await retry(
      () => this.getUploadInfo(url, biz_id, chunk_size, auth, size),
      this.options.retryTimes,
      this.options.retryDelay
    );
    this.emitter.emit("progress", {
      event: "getUploadInfo-end",
      progress: 0,
      data: uploadInfo,
    });
    // console.log("uploadInfo", uploadInfo);

    await this.uploadChunk(
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
      const res = await this.mergeVideoApi(url, params, auth);
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
    // console.log("暂停上传", this.chunkTasks);
    Object.values(this.chunkTasks)
      .filter(task => task.status === "running")
      .map(task => {
        this.progress[task.chunk + 1] = 0;
        task.controller.abort();
      });
  }
  start() {
    // console.log("继续上传", this.chunkTasks);
    const abortTasks = Object.values(this.chunkTasks).filter(
      task => task.status == "abort"
    );
    // console.log("暂停上传", this.queue.size, abortTasks.length);

    abortTasks.map(task => {
      task.controller = new AbortController();
      task.status = "pending";
      this.queue.add(() => this._uploadChunk(task));
    });
    this.queue.start();
    // console.log("开始上传", this.queue.size);
  }
  cancel() {
    this.queue.clear();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
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
