import url from "node:url";

import axios from "axios";
import { encWbi } from "~/base/sign.ts";

import type { CreateAxiosDefaults, AxiosRequestConfig } from "axios";
import type { CommonResponse, Request } from "~/types/index.d.ts";

export class BaseRequest {
  request: Request;
  protected wbiKeys: {
    img_key: string;
    sub_key: string;
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
    const resp = await this.request<
      never,
      CommonResponse<{
        isLogin: boolean;
        wbi_img: {
          img_url: string;
          sub_url: string;
        };
      }>
    >({
      url: "https://api.bilibili.com/x/web-interface/nav",
      method: "get",
      responseType: "json",
      headers: {
        cookie: null,
      },
    });
    const data = resp.data;
    const img_url = data.wbi_img.img_url;
    const sub_url = data.wbi_img.sub_url;

    this.wbiKeys = {
      img_key: img_url.slice(
        img_url.lastIndexOf("/") + 1,
        img_url.lastIndexOf(".")
      ),
      sub_key: sub_url.slice(
        sub_url.lastIndexOf("/") + 1,
        sub_url.lastIndexOf(".")
      ),
    };
    return this.wbiKeys;
  }
  async WbiSign(params: any) {
    if (this.wbiKeys?.img_key === undefined) await this.getWbiKeys();
    return encWbi(params, this.wbiKeys.img_key, this.wbiKeys.sub_key);
  }
}
