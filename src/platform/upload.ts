import fs from "node:fs";
import path from "node:path";
import { TypedEmitter } from "tiny-typed-emitter";

import PQueue from "p-queue";
import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import { readBytesFromFile, sum, retry } from "../utils/index.js";

import type { MediaPartOptions } from "../types/index.js";

export type Line = "auto" | "bda2" | "qn" | "qnhk" | "bldsa";

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
    } = {}
  ) {
    super(auth);
    this.options = Object.assign(
      {
        concurrency: 3,
        retryTimes: 3,
        retryDelay: 3000,
        line: "auto",
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

      const status = await this.uploadChunk(
        url,
        auth,
        uploadInfo.upload_id,
        chunk_size
      );
      if (!status) return;

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
      zone: "cs",
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
      "	https://member.bilibili.com/preupload?r=probe",
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
   * 切片上传api
   */
  async uploadChunkApi(options: UploadChunkTask, chunkData: Buffer) {
    const { start, size, auth, url, uploadId, chunk, chunks } = options;
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

    return this.request.put(url, chunkData, {
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
  }
  async _uploadChunk(options: UploadChunkTask, retryCount = 2) {
    const { filePath, start, chunk_size, size, chunk } = options;
    const chunkData = await readBytesFromFile(
      filePath,
      start,
      chunk_size,
      size
    );

    const partNumber = chunk + 1;
    this.chunkTasks[partNumber].status = "running";
    try {
      await this.uploadChunkApi(options, chunkData);
      return partNumber;
    } catch (e) {
      if (e.code == "ERR_CANCELED") {
        this.chunkTasks[partNumber].status = "abort";
      } else if (
        e.code === "ECONNABORTED" ||
        e.code === "ERR_BAD_RESPONSE" ||
        e.code === "ERR_BAD_REQUEST" ||
        e.code === "ETIMEDOUT"
      ) {
        if (retryCount > 0) {
          await this.sleep(this.options.retryDelay);
          this._uploadChunk(options, retryCount - 1);
        } else {
          this.chunkTasks[partNumber].status = "error";
          throw e;
        }
      } else {
        this.chunkTasks[partNumber].status = "error";
        throw e;
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
      // console.log("chunkParams", chunkParams.length);
      chunkParams.map(params => {
        return this.queue
          .add(() => this._uploadChunk(params))
          .catch(e => {
            reject(e);
          });
      });

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];

      this.queue.addListener("completed", partNumber => {
        this.chunkTasks[partNumber].status = "completed";
        parts.push({ partNumber, eTag: "etag" });
      });

      this.queue.on("idle", () => {
        if (parts.length === 0) {
          resolve(false);
        }
        // console.log("idle", parts.length, chunkParams.length);
        if (parts.length === chunkParams.length) {
          resolve(true);
        } else {
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
      this.queue.add(() => this._uploadChunk(task));
    });
    this.queue.start();
  }
  cancel() {
    this.status = "cancel";

    this.queue.clear();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
    this.emitter.emit("cancel");
  }
}
