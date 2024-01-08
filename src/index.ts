import fs from "node:fs";
import url from "node:url";

import { TvQrcodeLogin, WebQrcodeLogin } from "./user/login";
import { BaseRequest } from "./base/index";
import Live from "./live/index";
import Platform from "./platform";
import { WebVideoUploader } from "./platform/upload";
import Search from "./search/index";
import User from "./user/index";
import Video from "./video/index";
import Reply from "./video/reply";
import Common from "./common/index";
import { WbiSign } from "./base/sign";

declare module "axios" {
  export interface AxiosRequestConfig {
    extra?: {
      wbiSign?: boolean;
      rawResponse?: boolean;
    };
  }
}

class Client extends BaseRequest {
  cookie: string;
  cookieObj: {
    bili_jct: string;
    [key: string]: string;
  };
  accessToken?: string;
  useCookie: boolean;
  uid: number;

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
  video = new Video(this);
  reply = new Reply(this);

  /**
   * 创建一个新的视频对象
   * @param aid 视频aid
   */
  async newVideo(aid: number) {
    return new Video(this, aid);
  }

  /**
   * 创建一个新的评论区对象
   * @param oid 评论区oid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   */
  async newReply(oid: number, type: number) {
    return new Reply(this, oid, type);
  }

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
    this.uid = cookieObj.token_info.mid;
  }

  /**
   * 设置登录相关参数
   */
  async setAuth(
    cookie?: {
      bili_jct: string;
      SESSDATA: string;
      [key: string]: string;
    },
    accessToken?: string,
    uid?: number
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
    if (uid) {
      this.uid = uid;
    } else {
      const data = await this.user.getMyInfo();
      this.uid = data.profile.mid;
    }
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
  Common,
  Reply,
  Video,
  User,
  Search,
  Platform,
  Live,
};
