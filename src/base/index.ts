import axios from "axios";
import { encWbi, getWbiKeys } from "./sign";
import Auth from "./Auth";
import axiosRetry from "axios-retry";

import type { CreateAxiosDefaults } from "axios";
import type { Request } from "../types/index";

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
  auth: Auth;

  constructor(auth?: Auth, axiosOptions: CreateAxiosDefaults = {}) {
    this.auth = auth;
    const instance = axios.create({
      timeout: 1000000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
      ...axiosOptions,
    });

    instance.interceptors.request.use(config => {
      config.headers["cookie"] = this.auth.cookie;
      if (!config.extra?.useCookie) config.headers["cookie"] = undefined;

      if (!config.headers.host) {
        const url = new URL(config.url);
        config.headers["host"] = url.hostname;
      }

      console.log(config.headers);
      return config;
    });
    instance.interceptors.response.use(
      response => {
        const config = response.config;
        if (config.extra?.rawResponse) {
          return Promise.resolve(response.data);
        } else {
          if (response.data?.code !== 0) {
            return Promise.reject(response.data.message);
          } else {
            return Promise.resolve(response.data?.data);
          }
        }
      },
      error => {
        if (error.response) {
          return error.response;
        } else {
          return Promise.reject(error);
        }
      }
    );

    axiosRetry(instance, { retries: 0 });
    this.request = instance;
  }
  setAuth(auth: Auth) {
    this.auth = auth;
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
