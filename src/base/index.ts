import axios from "axios";
import { encWbi, getWbiKeys } from "./sign.js";
import Auth from "./Auth.js";
import axiosRetry from "axios-retry";
import { fakeDmCoverImgStr } from "../utils/index.js";
import { BiliResponseError } from "./Error.js";

import type { CreateAxiosDefaults } from "axios";
import type { Request } from "../types/index.js";

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
  protected auth: Auth;
  protected dm: {
    dm_img_list: string;
    dm_img_str: string;
    dm_cover_img_str: string;
    dm_img_inter: string;
  };

  constructor(auth?: Auth, axiosOptions: CreateAxiosDefaults = {}) {
    this.auth = auth;
    this.dm = {
      dm_img_list: "[]",
      dm_img_str: "",
      dm_cover_img_str: fakeDmCoverImgStr(
        "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0XX)), SwiftShader driver)Google Inc. (Google)"
      ),
      dm_img_inter: '{"ds":[],"wh":[0,0,0],"of":[0,0,0]}',
    };

    const instance = axios.create({
      timeout: 100000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
      ...axiosOptions,
    });

    instance.interceptors.request.use(config => {
      if (!config.headers["cookie"]) {
        config.headers["cookie"] = this?.auth?.cookie;
        if (config.extra?.useCookie == false)
          config.headers["cookie"] = undefined;
      }

      if (!config.headers.host) {
        const url = new URL(config.url);
        config.headers["host"] = url.hostname;
      }

      // console.log(config.headers, this.auth.cookie);
      return config;
    });
    instance.interceptors.response.use(
      response => {
        const config = response.config;
        if (config.extra?.rawResponse) {
          return Promise.resolve(response);
        } else {
          if (response.data?.code !== 0) {
            const message = response?.data?.message || "no message";
            const error = new BiliResponseError(`${message}`, {
              statusCode: response.status,
              code: response?.data?.code,
              path: config.url,
              method: config.method,
              rawResponse: response,
            });
            return Promise.reject(error);
          } else {
            return Promise.resolve(response.data?.data);
          }
        }
      },
      error => {
        const response = error.response;
        if (response?.status === 406) {
          const message =
            response?.data?.message + "（请尝试去web投稿解除)" || "no message";
          const error2 = new BiliResponseError(`${message}`, {
            statusCode: response.status,
            code: response?.data?.code,
            path: error.url,
            method: error.method,
            rawResponse: response,
          });
          return Promise.reject(error2);
        } else {
          return Promise.reject(error);
        }
      }
    );

    axiosRetry(instance, { retries: 0 });
    this.request = instance;
  }
  protected setAuth(auth: Auth) {
    this.auth = auth;
  }
  // 获取最新的 img_key 和 sub_key
  protected async getWbiKeys() {
    const wbiKeys = await getWbiKeys();
    this.wbiKeys = wbiKeys;
    return this.wbiKeys;
  }
  protected async WbiSign(params: any) {
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) delete params[key];
    });
    if (this.wbiKeys?.img_key === undefined) await this.getWbiKeys();
    return encWbi(params, this.wbiKeys.img_key, this.wbiKeys.sub_key);
  }
  /**
   * 获取buvid3,buvid3
   */
  protected async getBuvid() {
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
