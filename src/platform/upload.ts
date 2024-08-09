import path from "node:path";
import { TypedEmitter } from "tiny-typed-emitter";

import PQueue from "p-queue";
import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import { getFileSize, readBytesFromFile, sum, retry } from "../utils/index.js";

import type { MediaPartOptions } from "../types/index.js";

interface WebEmitterEvents {
  start: () => void;
  completed: (response: {
    cid: number;
    filename: string;
    title: string;
  }) => void;
  progress: (response: {
    event:
      | "preupload-start"
      | "preupload-end"
      | "getUploadInfo-start"
      | "getUploadInfo-end"
      | "uploading"
      | "merge-start"
      | "merge-end";
    progress: number;
    data?: any;
  }) => void;
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
  };
  on: TypedEmitter<WebEmitterEvents>["on"];
  once: TypedEmitter<WebEmitterEvents>["once"];
  off: TypedEmitter<WebEmitterEvents>["off"];

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
    this.on = this.emitter.on.bind(this);
    this.once = this.emitter.once.bind(this);
    this.off = this.emitter.off.bind(this);
  }

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

  private async getUploadInfo(
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

  private uploadChunk(
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
    this.queue.pause();
    Object.values(this.chunkTasks)
      .filter(task => task.status === "running")
      .map(task => {
        this.progress[task.chunk + 1] = 0;
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
      this.queue.add(() => this._uploadChunk(task));
    });
    this.queue.start();
  }
  cancel() {
    this.queue.clear();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
  }
}

export class WebVideoUploader2 extends BaseRequest {
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
    line: "auto" | "bda2" | "qn" | "qnhk" | "bldsa";
  };
  on: TypedEmitter<WebEmitterEvents>["on"];
  once: TypedEmitter<WebEmitterEvents>["once"];
  off: TypedEmitter<WebEmitterEvents>["off"];
  filePath: string;
  title: string;

  constructor(
    part: MediaPartOptions,
    auth: Auth = new Auth(),
    options: {
      concurrency?: number;
      retryTimes?: number;
      retryDelay?: number;
      line?: "auto" | "bda2" | "qn" | "qnhk" | "bldsa";
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
    this.on = this.emitter.on.bind(this);
    this.once = this.emitter.once.bind(this);
    this.off = this.emitter.off.bind(this);

    this.filePath = part.path;
    this.title = part.title || path.parse(this.filePath).name;
    this.progress = {};
  }

  async upload() {
    this.size = await getFileSize(this.filePath);

    const { url, biz_id, chunk_size, auth } = await this.preupload();
    const uploadInfo = await this.getUploadInfo(url, biz_id, chunk_size, auth);

    await this.uploadChunk(url, auth, uploadInfo.upload_id, chunk_size);

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
      data: params,
    });
    this.emitter.emit("completed", {
      cid: biz_id,
      filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
      title: this.title,
    });

    return {
      cid: biz_id,
      filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
      title: this.title,
    };
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
    });
    const uploadInfo = await retry(
      () => this.getUploadInfoApi(url, biz_id, chunk_size, auth),
      this.options.retryTimes,
      this.options.retryDelay
    );
    this.emitter.emit("progress", {
      event: "getUploadInfo-end",
      progress: 0,
      data: uploadInfo,
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
    return res.data.length[0];
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
      console.log("retry", retryCount, e.message);

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

  private uploadChunk(
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number
  ): Promise<{ partNumber: number; eTag: "etag" }[]> {
    return new Promise((resolve, reject) => {
      const queue = new PQueue({ concurrency: this.options.concurrency });
      this.queue = queue;

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
        return queue
          .add(() => this._uploadChunk(params))
          .catch(e => {
            reject(e);
          });
      });

      const parts: {
        partNumber: number;
        eTag: "etag";
      }[] = [];

      queue.addListener("completed", partNumber => {
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
    this.queue.pause();
    Object.values(this.chunkTasks)
      .filter(task => task.status === "running")
      .map(task => {
        this.progress[task.chunk + 1] = 0;
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
      this.queue.add(() => this._uploadChunk(task));
    });
    this.queue.start();
  }
  cancel() {
    this.queue.clear();
    Object.values(this.chunkTasks).map(task => {
      task.controller.abort();
    });
  }
}
