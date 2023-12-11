import type { Request, CommonResponse, Client } from "~/types/index.d.ts";
import type {
  MyInfoReturnType,
  GetUserInfoReturnType,
} from "~/types/user.d.ts";

export default class User {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  /**
   * 获取登录用户信息
   */
  async getMyInfo(): Promise<CommonResponse<MyInfoReturnType>> {
    this.client.authLogin();
    return this.request.get("https://api.bilibili.com/x/space/v2/myinfo");
  }
  /**
   * 获取用户信息
   * @param uid 用户id
   */
  async getUserInfo(
    uid: number
  ): Promise<CommonResponse<GetUserInfoReturnType>> {
    const signParams = await this.client.WbiSign({
      mid: uid,
      token: "",
      platform: "web",
      web_location: "1550101",
    });

    return this.request.get(
      `https://api.bilibili.com/x/space/wbi/acc/info?${signParams}`,
      {
        headers: {
          cookie: "buvid3=57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc",
        },
      }
    );
  }
  /**
   * 获取用户动态
   * 返回值参考 @link : https://socialsisteryi.github.io/bilibili-API-collect/docs/dynamic/get_dynamic_detail.html
   */
  async space(
    /** 用户id */
    mid: number,
    /** offset为分页参数，来自上一页返回接口的offset参数 */
    offset?: number,
    useCookie?: string
  ) {
    let cookie = useCookie !== undefined ? useCookie : this.client.useCookie;
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
    console.log(params);
    const signParams = await this.client.WbiSign(params);
    return this.request.get(
      `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${signParams}`,
      {
        headers: {
          cookie: cookie,
          "User-Agent": "Mozilla/5.0",
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
    useCookie?: string
  ) {
    const defaultParams = {
      ps: "30",
      tid: "0",
      pn: "1",
      keyword: "",
      order: "pubdate",
      platform: "web",
      web_location: "1550101",
      order_avoided: "true",
    };
    let cookie = useCookie !== undefined ? useCookie : this.client.useCookie;
    if (!cookie) {
      cookie =
        "buvid3=57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc;b_nut=1701088795";
    }

    const signParams = await this.client.WbiSign({
      ...defaultParams,
      ...params,
    });
    return this.request.get(
      `https://api.bilibili.com/x/space/wbi/arc/search?${signParams}`,
      {
        headers: {
          cookie: cookie,
          "User-Agent": "Mozilla/5.0",
          origin: "https://space.bilibili.com",
        },
      }
    );
  }
}
