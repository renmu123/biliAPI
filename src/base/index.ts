import url from "node:url";

import axios from "axios";
import { encWbi, getWbiKeys } from "~/base/sign.ts";

import type { CreateAxiosDefaults } from "axios";
import type { Request } from "~/types/index.d.ts";

export class BaseRequest {
  request: Request;
  protected wbiKeys: {
    img_key: string;
    sub_key: string;
  };
  protected buvid: {
    buvid3: string;
    buvid: string;
  };
  constructor(options?: CreateAxiosDefaults) {
    const instance = axios.create({
      timeout: 100000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
      ...options,
    });

    instance.interceptors.request.use(config => {
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }

      return config;
    });
    instance.interceptors.response.use(
      response => {
        return Promise.resolve(response.data);
      },
      error => {
        if (error.response) {
          return error.response;
        } else {
          return Promise.reject(error);
        }
      }
    );
    this.request = instance;
  }
  // 获取最新的 img_key 和 sub_key
  async getWbiKeys() {
    const wbiKeys = await getWbiKeys();
    this.wbiKeys = wbiKeys;
    return this.wbiKeys;
  }
  async WbiSign(params: any) {
    if (this.wbiKeys?.img_key === undefined) await this.getWbiKeys();
    return encWbi(params, this.wbiKeys.img_key, this.wbiKeys.sub_key);
  }
  /**
   * 获取buvid3,buvid3
   */
  async getBuvid() {
    if (this.buvid?.buvid3) return this.buvid;
    const res = await this.request.get(
      "https://api.bilibili.com/x/frontend/finger/spi"
    );
    this.buvid = {
      buvid3: res.data.b_3,
      buvid: res.data.b_4,
    };
    return {
      buvid3: res.data.b_3,
      buvid: res.data.b_4,
    };
  }
}
