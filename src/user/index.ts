import { fakeBuvid3 } from "../utils/index";
import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";

import type { MyInfoV2ReturnType, GetUserInfoReturnType } from "../types/user";

export default class User extends BaseRequest {
  noAuthUseCookie: boolean;
  constructor(auth: Auth = new Auth(), useCookie: boolean = false) {
    super(auth);
    this.noAuthUseCookie = useCookie;
  }
  /**
   * 获取登录用户信息
   */
  async getMyInfo(): Promise<MyInfoV2ReturnType> {
    this.auth.authLogin();
    return this.request.get("https://api.bilibili.com/x/space/v2/myinfo");
  }
  /**
   * 获取用户卡片信息
   * @param uid 用户id
   */
  async getCardInfo(uid: number) {
    return this.request.get(
      `https://api.bilibili.com/x/web-interface/card?mid=${uid}`
    );
  }
  /**
   * 获取用户信息
   * @param uid 用户id
   */
  async getUserInfo(
    uid: number,
    useCookie = this.noAuthUseCookie
  ): Promise<GetUserInfoReturnType> {
    const signParams = await this.WbiSign({
      mid: uid,
      token: "",
      platform: "web",
      web_location: "1550101",
    });

    let cookie = this.auth.cookie;
    if (!useCookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    }

    return this.request.get(
      `https://api.bilibili.com/x/space/wbi/acc/info?${signParams}`,
      {
        headers: {
          cookie: cookie,
          origin: "https://space.bilibili.com",
          referer: `https://space.bilibili.com/${uid}`,
        },
      }
    );
  }

  /**
   * 获取未登录情况下space可用的cookie
   */
  protected getSpaceCookie() {}
  /**
   * 获取用户动态
   * 返回值参考 @link : https://socialsisteryi.github.io/bilibili-API-collect/docs/dynamic/get_dynamic_detail.html
   */
  async space(
    /** 用户id */
    mid: number,
    /** offset为分页参数，来自上一页返回接口的offset参数 */
    offset?: number,
    useCookie: boolean = this.noAuthUseCookie
  ) {
    const params = {
      timezone_offset: -480,
      platform: "web",
      features: "itemOpusStyle,listOnlyfans,opusBigCover",
      host_mid: mid,
    };
    if (offset) {
      // @ts-ignore
      params.offset = offset;
    }
    const signParams = await this.WbiSign(params);
    return this.request.get(
      `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${signParams}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        extra: {
          useCookie,
        },
      }
    );
  }
  /**
   * 用户投稿列表
   */
  async getVideos(
    params: {
      mid: number;
      ps?: number;
      pn?: number;
      tid?: number;
      keyword?: string;
      order?: "pubdate" | "click" | "stow";
    },
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<{
    [key: string]: any;
  }> {
    const defaultParams = {
      ps: "30",
      tid: "0",
      pn: "1",
      keyword: "",
      order: "pubdate",
      platform: "web",
      web_location: "1550101",
      order_avoided: "true",
      ...this.dm,
    };
    let cookie = this.auth.cookie;
    if (!useCookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    }

    const signParams = await this.WbiSign({
      ...defaultParams,
      ...params,
    });
    return this.request.get(
      `https://api.bilibili.com/x/space/wbi/arc/search?${signParams}`,
      {
        headers: {
          cookie: cookie,
          origin: "https://space.bilibili.com",
          "accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
        },
      }
    );
  }
}
