import fs from "node:fs";

import axios from "axios";
import type { AxiosRequestConfig, AxiosProgressEvent } from "axios";

class RangeDownloader {
  url: string;
  private onerror: ((error: Error) => void) | null;
  private onload: ((downloader: RangeDownloader) => void) | null;
  private onprogress:
    | ((progress: { loaded: number; total: number; progress: number }) => void)
    | null;
  private oncompleted: ((downloader: RangeDownloader) => void) | null;
  totalSize: number;
  downloadedSize: number;
  private abortController: AbortController | null;
  // private supportPartial: boolean;
  filePath: string;
  private axiosRequestConfig?: {
    headers?: Record<string, string>;
    proxy?: AxiosRequestConfig["proxy"];
  };
  status:
    | "pending"
    | "running"
    | "paused"
    | "canceled"
    | "error"
    | "completed" = "pending";

  constructor(param: {
    url: string;
    filePath: string;
    axiosRequestConfig?: {
      headers?: Record<string, string>;
      proxy?: AxiosRequestConfig["proxy"];
    };
    onerror?: (error: Error) => void;
    onload?: (downloader: RangeDownloader) => void;
    onprogress?: (progress: {
      loaded: number;
      total: number;
      progress: number;
    }) => void;
    oncompleted?: (downloader: RangeDownloader) => void;
  }) {
    this.url = param.url;
    this.filePath = param.filePath;
    this.axiosRequestConfig = param.axiosRequestConfig;
    if (!this.url) {
      throw new Error("Invalid url.");
    }
    this.onerror = param.onerror || null;
    this.onload = param.onload || null;
    this.onprogress = param.onprogress || null;
    this.oncompleted = param.oncompleted || null;
    this.totalSize = 0;
    this.downloadedSize = 0;
    this.abortController = null;
    // this.supportPartial = false;
  }

  async start(): Promise<void> {
    console.log(
      "start",
      new Date(),
      this.filePath,
      this.downloadedSize,
      this.status
    );

    if (!["pending", "paused"].includes(this.status)) return;

    this.status = "running";
    console.log("start2", new Date(), this.filePath, this.downloadedSize);

    this.abortController = new AbortController();
    const _self = this;

    try {
      const response = await axios.get(this.url, {
        headers: {
          Range: "bytes=" + this.downloadedSize.toString() + "-",
          ...this.axiosRequestConfig?.headers,
        },
        proxy: this.axiosRequestConfig?.proxy,
        responseType: "stream",
        signal: this.abortController.signal,
        onDownloadProgress: progressEvent => {
          _self.downloadedSize += progressEvent.bytes;
          if (typeof _self.onprogress === "function") {
            _self.onprogress({
              loaded: _self.downloadedSize,
              total: _self.totalSize,
              progress: Math.round(_self.downloadedSize / _self.totalSize),
            });
          }
        },
      });

      // _self.supportPartial = response.status === 206;
      _self.totalSize = parseInt(
        response.headers["content-range"]?.split("/")[1] || "0",
        10
      );
      _self.totalSize = isNaN(_self.totalSize)
        ? parseInt(response.headers["content-length"] || "0", 10)
        : _self.totalSize;

      const writableStream = fs.createWriteStream(this.filePath, {
        flags: "a",
      });

      response.data.pipe(writableStream);

      writableStream.on("finish", () => {
        console.log("writableStream finish", this.filePath);
        this.status = "completed";
        if (typeof _self.oncompleted === "function") {
          _self.oncompleted(_self);
        }
      });
      writableStream.on("error", error => {
        console.log("writableStream error", this.filePath);
        throw error;
      });

      if (typeof _self.onload === "function") {
        _self.onload(_self);
      }
    } catch (e) {
      if (axios.isCancel(e)) {
        return;
      }

      if (typeof _self.onerror === "function") {
        _self.onerror(e);
      }

      this.status = "error";
      throw e;
    }
  }

  pause(): void {
    if (this.status !== "running") return;

    this.status = "paused";

    this.abortController !== null ? this.abortController.abort() : undefined;
    // this.downloadedSize = this.supportPartial ? this.downloadedSize : 0;
    console.log(
      "pause",
      new Date(),
      this.filePath,
      this.downloadedSize,
      this.abortController
    );
  }

  cancel(): void {
    if (!["running", "pending", "paused"].includes(this.status)) return;

    this.status = "canceled";
    this.abortController !== null ? this.abortController.abort() : undefined;
    this.downloadedSize = 0;
    this.totalSize = 0;
    // this.supportPartial = false;
  }
}

export default RangeDownloader;
