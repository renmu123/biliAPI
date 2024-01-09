import { fakeBuvid3 } from "../utils/index";
import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";
import type { SearchTypeParams } from "../types/search";

export default class Search extends BaseRequest {
  noAuthUseCookie: boolean;
  constructor(auth: Auth = new Auth(), useCookie: boolean = false) {
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
    const signParams = await this.WbiSign(params);
    const res = this.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?${signParams}`,
      {
        headers: {
          cookie: `buvid3=${fakeBuvid3()}`,
        },
        extra: {
          useCookie,
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
    const signParams = await this.WbiSign(params);
    const res = this.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/type?${signParams}`,
      {
        headers: {
          cookie: `buvid3=${fakeBuvid3()}`,
        },
        extra: {
          useCookie,
        },
      }
    );
    return res;
  }
}
