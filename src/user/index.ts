import { randomBytes } from "crypto";

import { fakeBuvid3 } from "../utils/index";
import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";

import type {
  MyInfoV2ReturnType,
  GetUserInfoReturnType,
  Season,
  Series,
  SeriesMeta,
  SeriesArchive,
  SeasonMeta,
} from "../types/user";

export default class User extends BaseRequest {
  noAuthUseCookie: boolean;
  spaceCookie: string;
  constructor(auth: Auth = new Auth(), useCookie: boolean = true) {
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
    if (!this.auth.cookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    } else {
      if (!useCookie) {
        cookie = `buvid3=${fakeBuvid3()}`;
      }
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
  protected async getSpaceCookie() {
    if (this.spaceCookie) return this.spaceCookie;
    const response = await this.request.get(
      "https://space.bilibili.com/1/dynamic",
      {
        extra: {
          useCookie: false,
          rawResponse: true,
        },
      }
    );
    // 更新cookies
    const spmPrefix = response.data.match(
      /<meta name="spm_prefix" content="([^"]+?)">/
    )[1];
    const cookies = response.headers["set-cookie"]
      .map(cookie => {
        return cookie.split(";")[0];
      })
      .join("; ");

    // 构建数据
    const randPngEnd = Buffer.concat([
      randomBytes(32),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("IEND"),
      randomBytes(4),
    ])
      .toString("base64")
      .slice(-50);
    const ua = this.request.defaults.headers["User-Agent"] as string;
    const data = {
      "3064": 1,
      "39c8": `${spmPrefix}.fp.risk`,
      "3c43": {
        adca: "Win32" || (ua && ua.includes("Windows")) ? "Win32" : "Linux",
        bfe9: randPngEnd,
      },
    };

    const json_data = {
      payload: JSON.stringify(data),
    };

    // 发送第二个请求
    await this.request.post(
      "https://api.bilibili.com/x/internal/gaia-gateway/ExClimbWuzhi",
      json_data,
      {
        headers: {
          cookie: cookies,
        },
      }
    );
    this.spaceCookie = cookies;
    return this.spaceCookie;
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
    useCookie: boolean = this.noAuthUseCookie
  ) {
    const params = {
      timezone_offset: -480,
      platform: "web",
      features: "itemOpusStyle,listOnlyfans,opusBigCover",
      host_mid: mid,
      offset: offset,
    };
    if (offset === undefined) delete params.offset;
    let cookies = this.auth.cookie;

    if (!this.auth.cookie) {
      cookies = await this.getSpaceCookie();
    } else {
      if (!useCookie) {
        cookies = await this.getSpaceCookie();
      }
    }

    const signParams = await this.WbiSign(params);
    return this.request.get(
      `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${signParams}`,
      {
        headers: {
          cookie: cookies,
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
    episodic_button: {
      text: string;
      uri: string;
    };
    gaia_data: any;
    gaia_res_type: number;
    is_risk: boolean;
    list: {
      slist: any[];
      tlist: {
        [key: string]: {
          tid: number;
          count: number;
          name: string;
        }[];
      };
      vlist: {
        comment: number;
        typeid: number;
        play: number;
        pic: string;
        subtitle: string;
        description: string;
        copyright: string;
        title: string;
        review: number;
        author: string;
        mid: number;
        created: number;
        length: string;
        video_review: number;
        aid: number;
        bvid: string;
        hide_click: boolean;
        is_pay: number;
        is_union_video: number;
        is_steins_gate: number;
        is_live_playback: number;
        is_lesson_video: number;
        is_lesson_finished: number;
        lesson_update_info: string;
        jump_url: string;
        meta: null | any; // You can replace 'any' with a more specific type if needed
        is_avoided: number;
        season_id: number;
        attribute: number;
        is_charging_arc: boolean;
        vt: number;
        enable_vt: number;
        vt_display: string;
        playback_position: number;
      }[];
    };
    page: {
      count: number;
      num: number;
      size: number;
    };
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
    if (!this.auth.cookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    } else {
      if (!useCookie) {
        cookie = `buvid3=${fakeBuvid3()}`;
      }
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
          referer: `https://space.bilibili.com/${params.mid}`,
        },
      }
    );
  }
  /**
   * 合集和视频列表
   */
  async getCollectionList(params: {
    mid: number;
    page_size?: number;
    page_num?: number;
  }): Promise<{
    items_lists: {
      page: {
        total: number;
        page_num: number;
        page_size: number;
      };
      seasons_list: Season[];
      series_list: Series[];
    };
  }> {
    const signParams = await this.WbiSign(params);
    return this.request.get(
      `https://api.bilibili.com/x/space/collection/list?${signParams}`
    );
  }
  /**
   * 合集-视频列表
   */
  async getSeriesInfo(params: { series_id: number }): Promise<{
    meta: SeriesMeta;
    recent_aids: number[];
  }> {
    return this.request.get("https://api.bilibili.com/x/series/series", {
      params,
    });
  }
  /**
   * 合集-视频列表-投稿列表
   */
  async getSeriesVideos(params: {
    mid: number;
    series_id: number;
    only_normal?: boolean;
    sort?: "asc" | "desc";
    pn?: number;
    ps?: number;
    current_mid?: number;
  }): Promise<{
    aids: number[];
    archives: SeriesArchive[];
    page: {
      total: number;
      page_num: number;
      page_size: number;
    };
  }> {
    return this.request.get("https://api.bilibili.com/x/series/archives", {
      params,
    });
  }

  /**
   * 合集-视频列表-合集投稿列表
   */
  async getSeasons(params: {
    mid: number;
    season_id: number;
    sort_reverse?: boolean;
    page_num?: number;
    page_size?: number;
    web_location?: string;
  }): Promise<{
    aids: number[];
    archives: SeriesArchive[];
    meta: SeasonMeta;
    page: {
      total: number;
      page_num: number;
      page_size: number;
    };
  }> {
    const signParams = await this.WbiSign(params);
    return this.request.get(
      `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?${signParams}`
    );
  }
}
