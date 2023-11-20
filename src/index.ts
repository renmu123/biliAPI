import fs from "fs";
import url from "url";

import axios from "axios";
import type { Request, MediaOptions, CommonResponse } from "~/types/index.d.ts";
import { checkTag } from "~/member/index.ts";
import { BiliQrcodeLogin } from "~/user/login.ts";
import {
  WebVideoUploader,
  addMediaWeb,
  editMedia,
  addMediaClient,
} from "~/media/upload.ts";
import { getArchives } from "~/media/index.ts";

export default class Client {
  request: Request;
  cookie: string;
  accessToken: string;

  constructor(requestOptions = {}) {
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
  async loadCookieFile(path: string) {
    const cookie = await fs.promises.readFile(path, "utf-8");
    const cookieObj = JSON.parse(cookie);

    const cookieStr = cookieObj.cookie_info.cookies
      .map(
        (item: { name: string; value: string }) => `${item.name}=${item.value}`
      )
      .join("; ");
    this.cookie = cookieStr;
    this.accessToken = cookieObj.token_info.access_token;
  }
  async checkTag(tag: string) {
    this.authLogin();

    return checkTag(this.request, tag);
  }

  /**
   * 投稿视频，推荐使用client api
   * @param filePaths 文件路径
   * @param options
   * @param api
   * @returns
   */
  async addMedia(
    filePaths: string[],
    options: MediaOptions,
    api: "client" | "web" = "client"
  ): Promise<CommonResponse<{ aid: number; bvid: string }>> {
    this.authLogin();

    const uploader = new WebVideoUploader(this.request, filePaths);
    const videos = await uploader.upload();

    if (api === "client") {
      const res = await addMediaClient(
        this.request,
        videos,
        this.accessToken,
        options
      );
      return res;
    } else if (api === "web") {
      const res = await addMediaWeb(this.request, videos, this.cookie, options);
      return res;
    } else {
      throw new Error("You can only set api as client or web");
    }
  }

  // 编辑投稿
  editMedia(
    aid: number,
    options: MediaOptions,
    api: "client" | "web" = "client"
  ) {
    this.authLogin();
  }

  // 登录验证
  async authLogin() {
    const isLogin = !!this.cookie;
    if (!isLogin) {
      throw new Error("You need to login first");
    }
  }

  getArchives(
    options: Parameters<typeof getArchives>[1]
  ): ReturnType<typeof getArchives> {
    this.authLogin();

    return getArchives(this.request, options);
  }
}

export { BiliQrcodeLogin };
