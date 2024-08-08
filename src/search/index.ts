import { fakeBuvid3 } from "../utils/index.js";
import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import type { SearchTypeParams } from "../types/search.js";

export default class Search extends BaseRequest {
  noAuthUseCookie: boolean;
  constructor(auth: Auth = new Auth(), useCookie: boolean = true) {
    super(auth);
    this.noAuthUseCookie = useCookie;
  }
  async all(
    params: {
      keyword: string;
      page: number;
      page_size: number;
    },
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<{
    [key: string]: any;
  }> {
    let cookie = this.auth.cookie;
    if (!this.auth.cookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    } else {
      if (!useCookie) {
        cookie = `buvid3=${fakeBuvid3()}`;
      }
    }
    const signParams = await this.WbiSign(params);
    const res = this.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?${signParams}`,
      {
        headers: {
          cookie: cookie,
        },
      }
    );
    return res;
  }
  /**
   * 分类搜索
   * @param {SearchTypeParams} params - 搜索参数
   */
  async type(
    params: SearchTypeParams,
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<{
    [key: string]: any;
  }> {
    let cookie = this.auth.cookie;
    if (!this.auth.cookie) {
      cookie = `buvid3=${fakeBuvid3()}`;
    } else {
      if (!useCookie) {
        cookie = `buvid3=${fakeBuvid3()}`;
      }
    }

    const signParams = await this.WbiSign(params);
    const res = this.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/type?${signParams}`,
      {
        headers: {
          cookie: cookie,
        },
      }
    );
    return res;
  }
}
