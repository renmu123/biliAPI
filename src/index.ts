import { TvQrcodeLogin, WebQrcodeLogin } from "./user/login";
import Auth from "./base/Auth";
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
      useCookie?: boolean;
    };
  }
}

class Client {
  auth: Auth = new Auth();
  useCookie: boolean;

  /**
   * @param noAuthUseCookie 无需登录的接口是否使用cookie
   */
  constructor(noAuthUseCookie = false) {
    this.useCookie = noAuthUseCookie;
    // super(undefined, useCookie);
  }
  get live() {
    return new Live(this.auth, this.useCookie);
  }
  get user() {
    return new User(this.auth, this.useCookie);
  }
  get platform() {
    return new Platform(this.auth);
  }
  get search() {
    return new Search(this.auth, this.useCookie);
  }
  get common() {
    return new Common(this.auth, this.useCookie);
  }
  get video() {
    return new Video(this.auth, this.useCookie);
  }
  get reply() {
    return new Reply(this.auth, this.useCookie);
  }

  /**
   * 创建一个新的视频对象
   * @param aid 视频aid
   */
  async newVideo(aid: number) {
    return new Video(this.auth, this.useCookie, aid);
  }

  /**
   * 创建一个新的评论区对象
   * @param oid 评论区oid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   */
  async newReply(oid: number, type: number) {
    return new Reply(this.auth, this.useCookie, oid, type);
  }

  /**
   * 加载cookie文件，仅限TvQrcodeLogin返回的参数
   * @param path cookie文件路径
   */
  async loadCookieFile(path: string) {
    return this.auth.loadCookieFile(path);
  }

  /**
   * 设置登录相关参数
   */
  async setAuth(
    cookie?: {
      bili_jct: string;
      SESSDATA: string;
      DedeUserID: string | number;
      [key: string]: string | number;
    },
    accessToken?: string
  ) {
    return this.auth.setAuth(cookie, accessToken);
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
  Auth,
};
