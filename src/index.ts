import fs from "node:fs";
import url from "node:url";

import { TvQrcodeLogin, WebQrcodeLogin } from "./user/login";
import { BaseRequest } from "./base/index";
import Live from "./live/index";
import Platform from "./platform";
import { WebVideoUploader } from "./platform/upload";
import Search from "./search/index";
import User from "./user/index";
import Common from "./common/index";
import { WbiSign } from "./base/sign";

import type { CommonResponse } from "./types";

class Client extends BaseRequest {
  cookie: string;
  cookieObj: {
    bili_jct: string;
    [key: string]: string;
  };
  accessToken?: string;
  useCookie: boolean;

  /**
   * @param useCookie 无需登录的接口是否使用cookie
   */
  constructor(useCookie = false) {
    super();
    this.useCookie = useCookie;

    this.request.interceptors.request.use(config => {
      if (this.cookie && config.headers["cookie"] === undefined) {
        config.headers["cookie"] = this.cookie;
      }
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }

      return config;
    });
  }
  live = new Live(this);
  user = new User(this);
  platform = new Platform(this);
  search = new Search(this);
  common = new Common(this);

  /**
   * 加载cookie文件，仅限TvQrcodeLogin返回的参数
   * @param path cookie文件路径
   */
  async loadCookieFile(path: string) {
    const cookie = await fs.promises.readFile(path, "utf-8");
    const cookieObj = JSON.parse(cookie);

    const cookieStr = cookieObj.cookie_info.cookies
      .map(
        (item: { name: string; value: string }) => `${item.name}=${item.value}`
      )
      .join("; ");
    this.cookie = cookieStr;
    this.cookieObj = cookieObj.cookie_info.cookies.reduce(
      (
        obj: { [key: string]: string },
        item: { name: string; value: string }
      ) => {
        obj[item.name] = item.value;
        return obj;
      },
      {}
    );
    this.accessToken = cookieObj.token_info.access_token;
  }

  /**
   * 设置登录相关参数
   */
  setAuth(
    cookie?: {
      bili_jct: string;
      SESSDATA: string;
      [key: string]: string;
    },
    accessToken?: string
  ) {
    if (cookie) {
      this.cookieObj = cookie;
      this.cookie = Object.entries(cookie)
        .map(([key, value]) => {
          return `${key}=${value}`;
        })
        .join("; ");
    }

    this.accessToken = accessToken;
  }

  /**
   * 登录验证
   * @param [api=["web"]] 用于验证web还是client api
   */
  async authLogin(api: Array<"web" | "client" | "b-cut"> = ["web"]) {
    if (api.includes("web")) {
      const isLogin = !!this.cookie;
      if (!isLogin) {
        throw new Error("接口为web端接口，需要cookie");
      }
    }
    if (api.includes("b-cut")) {
      const isLogin = !!this.cookie;
      if (!isLogin) {
        throw new Error("接口为必剪pc端接口，需要cookie");
      }
    }
    if (api.includes("client")) {
      const isLogin = !!this.accessToken;
      if (!isLogin) {
        throw new Error(
          "接口为客户端接口，需要access_token，请使用客户端登录接口"
        );
      }
    }
  }
}

const utils = {
  WbiSign,
};

export {
  TvQrcodeLogin,
  Client,
  utils,
  WebVideoUploader,
  WebQrcodeLogin,
  CommonResponse,
};
