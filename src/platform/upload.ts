import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { URL } from "node:url";
import { TypedEmitter } from "tiny-typed-emitter";

import PQueue from "p-queue";
import Throttle from "@renmu/throttle";
import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import {
  createReadStream,
  readBytesFromFile,
  sum,
  retry,
  streamToBuffer,
} from "../utils/index.js";

import type { MediaPartOptions } from "../types/index.js";

export type Line = "auto" | string;

interface WebEmitterEvents {
  start: () => void;
  completed: (response: {
    cid: number;
    filename: string;
    title: string;
  }) => void;
  progress: (response: {
    event:
      | "init"
      | "preupload-start"
      | "preupload-end"
      | "getUploadInfo-start"
      | "getUploadInfo-end"
      | "uploading"
      | "merge-start"
      | "merge-end";
    progress: number;
    data: {
      loaded: number;
      total: number;
      [key: string]: any;
    };
  }) => void;
  error: (error: Error) => void;
  cancel: () => void;
  debug: (data: any) => void;
}

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
  private status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "error"
    | "cancel" = "pending";
  queue: PQueue;
  emitter = new TypedEmitter<WebEmitterEvents>();
  progress: { [key: string]: number } = {};
  chunkTasks: {
    [key: number]: UploadChunkTask;
  } = {};
  size: number = 0;
  options: {
    concurrency: number;
    retryTimes: number;
    retryDelay: number;
    line: Line;
    zone: string;
    limitRate: number;
  };
  on: TypedEmitter<WebEmitterEvents>["on"];
  once: TypedEmitter<WebEmitterEvents>["once"];
  off: TypedEmitter<WebEmitterEvents>["off"];
  filePath: string;
  title: string;
  completedPart: {
    cid: number;
    filename: string;
    title: string;
  };

  constructor(
    part: MediaPartOptions,
    auth: Auth = new Auth(),
    options: {
      concurrency?: number;
      retryTimes?: number;
      retryDelay?: number;
      line?: Line;
      zone?: string;
      throttleRate?: number;
    } = {}
  ) {
    super(auth);
    this.options = Object.assign(
      {
        concurrency: 3,
        retryTimes: 3,
        retryDelay: 3000,
        line: "auto",
        zone: "cs",
        limitRate: 0,
      },
      options
    );

    this.filePath = part.path;
    this.title = part.title || path.parse(this.filePath).name;
    this.progress = {};
    this.queue = new PQueue({ concurrency: this.options.concurrency });

    this.on = this.emitter.on.bind(this.emitter);
    this.once = this.emitter.once.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);

    try {
      this.size = this.getFileSizeSync(this.filePath);
      this.emitter.emit("progress", {
        event: "init",
        progress: 1,
        data: {
          loaded: 0,
          total: this.size,
        },
      });
    } catch (e) {
      this.emitter.emit("error", e);
      this.status = "error";
      throw e;
    }
  }

  getFileSizeSync(filePath: string) {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
  }

  async upload() {
    try {
      this.status = "running";

      const { url, biz_id, chunk_size, auth } = await this.preupload();
      const uploadInfo = await this.getUploadInfo(
        url,
        biz_id,
        chunk_size,
        auth
      );

      // 取消操作可能在上传之前进行，如果已经触发，拦截后续操作
      // @ts-expect-error
      if (this.status === "cancel") return;

      const status = await this.uploadChunk(
        url,
        auth,
        uploadInfo.upload_id,
        chunk_size
      );
      if (!status) {
        if (this.status === "running") {
          throw new Error("上传失败");
        }
        return;
      }

      const params = {
        name: this.title,
        uploadId: uploadInfo.upload_id,
        biz_id: biz_id,
        output: "json",
        profile: "ugcupos/bup",
      };

      this.emitter.emit("progress", {
        event: "merge-start",
        progress: 1,
        data: {
          loaded: this.size,
          total: this.size,
        },
      });
      const res = await retry(
        () => this.mergeVideoApi(url, params, auth),
        5,
        5000
      );
      if (res.OK !== 1) {
        throw new Error("合并视频失败");
      }

      this.emitter.emit("progress", {
        event: "merge-end",
        progress: 1,
        data: { ...params, loaded: this.size, total: this.size },
      });

      const completedPart = {
        cid: biz_id,
        filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
        title: this.title,
      };
      this.completedPart = completedPart;
      this.emitter.emit("completed", completedPart);
      this.status = "completed";

      return completedPart;
    } catch (e) {
      if (this.status === "cancel") return;

      this.emitter.emit("error", e);
      this.status = "error";
      throw e;
    }
  }

  /**
   * 获取上传信息
   */
  async getUploadInfo(
    url: string,
    biz_id: number,
    chunk_size: number,
    auth: string
  ): Promise<{
    OK: number;
    bucket: string;
    key: string;
    upload_id: string;
  }> {
    this.emitter.emit("progress", {
      event: "getUploadInfo-start",
      progress: 0,
      data: {
        loaded: 0,
        total: this.size,
      },
    });
    const uploadInfo = await retry(
      () => this.getUploadInfoApi(url, biz_id, chunk_size, auth),
      this.options.retryTimes,
      this.options.retryDelay
    );
    this.emitter.emit("progress", {
      event: "getUploadInfo-end",
      progress: 0,
      data: { ...uploadInfo, loaded: 0, total: this.size },
    });
    return uploadInfo;
  }

  /**
   * 上传预处理，获取线路等信息
   */
  async preupload() {
    this.emitter.emit("progress", {
      event: "preupload-start",
      progress: 0,
      data: {
        loaded: 0,
        total: this.size,
      },
    });
    let query: Record<string, string> = {
      zone: this.options.zone,
      upcdn: this.options.line,
      probe_version: "20221109",
    };
    if (this.options.line === "auto") {
      const line = await retry(
        () => this.getUploadLineApi(),
        this.options.retryTimes,
        this.options.retryDelay
      );
      const params = new URLSearchParams(line.query);
      query = Object.fromEntries(params.entries());
    }

    const data = await retry(
      () => this.preuploadApi(query),
      this.options.retryTimes,
      this.options.retryDelay
    );
    this.emitter.emit("progress", {
      event: "preupload-end",
      progress: 0,
      data: {
        loaded: 0,
        total: this.size,
      },
    });
    const { endpoint, upos_uri, biz_id, chunk_size, auth } = data;
    const url = `https:${endpoint}/${upos_uri.replace("upos://", "")}`;

    return {
      url,
      biz_id,
      chunk_size,
      auth,
    };
  }

  /**
   * 上传预处理，获取线路等信息
   */
  async preuploadApi(query: Record<string, string>): Promise<{
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
    const { base } = path.parse(this.filePath);
    const res = await this.request.get(
      "https://member.bilibili.com/preupload",
      {
        params: {
          name: base,
          r: "upos",
          profile: "ugcfx/bup",
          ssl: "0",
          version: "",
          build: "2140000",
          size: this.size,
          webVersion: "2.14.0",
          ...query,
        },
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
  }

  /**
   * 自动选择线路
   */
  async getUploadLineApi(): Promise<{
    os: string;
    query: string;
    probe_url: string;
  }> {
    const res = await this.request.get(
      "https://member.bilibili.com/preupload?r=probe",
      {
        extra: {
          rawResponse: true,
        },
      }
    );
    if (res.data.OK !== 1) {
      throw new Error("获取线路失败");
    }
    if (res.data.lines.length === 0) {
      throw new Error("获取线路失败");
    }
    return res.data.lines[0];
  }

  private async getUploadInfoApi(
    url: string,
    biz_id: number,
    chunk_size: number,
    auth: string
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
        filesize: this.size,
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

  /**
   * 切片上传api - 使用原生https模块实现
   */
  async uploadChunkApi(
    options: UploadChunkTask,
    throttleStream: fs.ReadStream | Buffer,
    streamSize: number
  ) {
    const { start, size, auth, url, uploadId, chunk, chunks } = options;
    const params = {
      uploadId: uploadId,
      partNumber: chunk + 1,
      chunk: chunk,
      chunks: chunks,
      size: streamSize,
      start: start,
      end: start + streamSize,
      total: size,
    };

    return this.uploadChunkWithHttps(
      url,
      params,
      auth,
      throttleStream,
      streamSize,
      options.controller.signal,
      (loaded: number) => {
        this.progress[params.partNumber] = loaded;
        const progress = sum(Object.values(this.progress));
        this.emitter.emit("progress", {
          event: `uploading`,
          progress: progress / size,
          data: {
            loaded: progress,
            total: size,
          },
        });
      }
    );
  }

  /**
   * 使用原生 https 模块进行流式上传
   */
  private uploadChunkWithHttps(
    baseUrl: string,
    params: any,
    auth: string,
    fileStream: fs.ReadStream | Buffer,
    streamSize: number,
    abortSignal: AbortSignal,
    onProgress: (loaded: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 构建完整的URL（包含查询参数）
      const urlWithParams = new URL(baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        urlWithParams.searchParams.append(key, String(value));
      });

      let uploaded = 0;

      const options: https.RequestOptions = {
        hostname: urlWithParams.hostname,
        port: urlWithParams.port || 443,
        path: urlWithParams.pathname + urlWithParams.search,
        method: "PUT",
        headers: {
          "X-Upos-Auth": auth,
          "Content-Length": streamSize.toString(),
          Connection: "keep-alive",
          "Content-Type": "application/octet-stream",
          cookie: this?.auth?.cookie,
        },
        timeout: 1000000,
      };

      const req = https.request(options, res => {
        let responseData = "";

        res.on("data", chunk => {
          responseData += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Upload failed with status: ${res.statusCode}, response: ${responseData}`
              )
            );
          }
        });
      });

      req.on("error", error => {
        reject(new Error(`Upload request failed: ${error.message}`));
      });

      // 处理中止信号
      if (abortSignal.aborted) {
        const abortError = new Error("Upload aborted");
        abortError.name = "AbortError";
        reject(abortError);
        req.destroy();
        return;
      }

      abortSignal.addEventListener("abort", () => {
        const abortError = new Error("Upload aborted");
        abortError.name = "AbortError";
        reject(abortError);
        req.destroy();
      });

      // 如果是 Buffer，直接写入
      if (Buffer.isBuffer(fileStream)) {
        req.write(fileStream);
        onProgress(fileStream.length);
        req.end();
      } else {
        // 如果是流，监听进度并管道连接
        fileStream.on("data", (chunk: Buffer) => {
          uploaded += chunk.length;
          onProgress(uploaded);
        });

        fileStream.on("error", error => {
          reject(new Error(`File stream error: ${error.message}`));
        });

        fileStream.on("end", () => {
          // File stream ended
        });

        // 将文件流管道连接到请求
        fileStream.pipe(req);
      }
    });
  }
  async _uploadChunk(
    options: UploadChunkTask,
    retryCount = this.options.retryTimes
  ) {
    const { filePath, start, chunk_size, size, chunk } = options;

    let [stream] = createReadStream(filePath, start, chunk_size, size);
    if (this.options.limitRate > 0) {
      stream = stream.pipe(new Throttle(this.options.limitRate * 1024));
    }

    const partNumber = chunk + 1;
    this.chunkTasks[partNumber].status = "running";

    while (retryCount >= 0) {
      try {
        await this.uploadChunkApi(options, stream, chunk_size);
        return partNumber;
      } catch (e) {
        if (e.code == "ERR_CANCELED") {
          this.chunkTasks[partNumber].status = "abort";
          return;
        } else {
          if (retryCount > 0) {
            await this.sleep(this.options.retryDelay);
            retryCount--;
          } else {
            this.chunkTasks[partNumber].status = "error";
            throw e;
          }
        }
        //  else {
        //   this.chunkTasks[partNumber].status = "error";
        //   throw e;
        // }
      }
    }
  }

  /**
   * 上传切片
   * return boolean 是否上传成功，如果否可能就是被取消了
   */
  private uploadChunk(
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const numberOfChunks = Math.ceil(this.size / chunk_size);
      const chunkParams: UploadChunkTask[] = [];
      for (let i = 0; i < numberOfChunks; i++) {
        const start = i * chunk_size;
        const controller = new AbortController();
        const partNumber = i + 1;
        const data: UploadChunkTask = {
          filePath: this.filePath,
          start: start,
          chunk_size: chunk_size,
          size: this.size,
          auth: auth,
          url: url,
          uploadId,
          chunks: numberOfChunks,
          chunk: i,
          status: "pending",
          controller: controller,
        };
        chunkParams.push(data);
        this.chunkTasks[partNumber] = data;
      }
      for (let i = 0; i < chunkParams.length; i++) {
        this.queue.add(() => this._uploadChunk(chunkParams[i])).catch(e => {});
      }

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];

      this.queue.on("error", error => {
        this.taskClear();
        reject(error);
      });

      this.queue.addListener("completed", partNumber => {
        if (partNumber === undefined) return;
        this.chunkTasks[partNumber].status = "completed";
        parts.push({ partNumber, eTag: "etag" });
      });

      this.queue.on("idle", () => {
        if (parts.length === 0) {
          resolve(false);
        }
        if (parts.length === chunkParams.length) {
          resolve(true);
        } else {
          this.emitter.emit(
            "debug",
            JSON.stringify({ text: "completed parts", parts })
          );
          resolve(false);
        }
      });
    });
  }

  private async mergeVideoApi(
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

  pause() {
    this.status = "paused";

    this.queue.pause();
    Object.values(this.chunkTasks)
      .filter(task => task.status === "running")
      .map(task => {
        this.progress[task.chunk + 1] = 0;
        task.controller.abort();
      });
  }
  start() {
    this.status = "running";

    const abortTasks = Object.values(this.chunkTasks).filter(
      task => task.status == "abort"
    );

    abortTasks.map(task => {
      task.controller = new AbortController();
      task.status = "pending";
      this.queue.add(() => this._uploadChunk(task)).catch(e => {});
    });
    this.queue.start();
  }
  cancel() {
    this.status = "cancel";

    this.taskClear();
    this.emitter.emit("cancel");
  }
  taskClear() {
    this.queue.clear();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
  }
}
