import fs from "fs";
import url from "url";

import axios from "axios";
import type { Request, MediaOptions } from "~/types";
import { checkTag } from "~/member/index.ts";
import { generate_qrcode, poll_qrcode } from "~/user/login.ts";
import { Uploader, addMedia, editMedia } from "~/media/upload.ts";

export default class Client {
  request: Request;
  cookie: string;

  constructor(cookie?: string, requestOptions = {}) {
    this.cookie = cookie;
    this.request = axios.create({
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/63.0.3239.108",
      },
      ...requestOptions,
    });

    this.request.interceptors.request.use(config => {
      if (this.cookie) {
        config.headers["cookie"] = this.cookie;
      }
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }
      return config;
    });
  }
  load_cookie(filePath: string) {
    this.cookie = fs.readFileSync(filePath, "utf-8");
  }
  save_cookie(filePath: string, cookie: string | string[]) {
    if (Array.isArray(cookie)) {
      this.cookie = cookie.join(";");
    } else {
      this.cookie = cookie;
    }
    fs.writeFileSync(filePath, this.cookie);
  }
  async checkTag(tag: string) {
    return checkTag(this.request, tag);
  }
  generate_qrcode() {
    return generate_qrcode(this.request);
  }
  poll_qrcode(qrcode_key: string) {
    return poll_qrcode(this.request, qrcode_key);
  }
  // 新增投稿
  // upload(filePath: string, options: MediaOptions) {
  //   const uploader = new Uploader(this.request, this.cookie, filePath, options);
  //   return uploader.upload();
  // }
  // 新增投稿
  async addMedia(filePaths: string[], options: MediaOptions) {
    const uploader = new Uploader(this.request, filePaths);
    const videos = await uploader.upload();
    // return uploader.upload2();
    const res = await addMedia(this.request, [videos[0]], this.cookie, options);
    console.log("add res", res.data);

    if (res.data.code !== 0) {
      throw new Error(res.data.message);
    }
    const { aid } = res.data.data;

    return editMedia(this.request, videos, this.cookie, { aid, ...options });
  }
  // 编辑投稿
  editMedia(aid: number, options: MediaOptions) {}
}
