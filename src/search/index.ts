import { fakeBuvid3 } from "../utils/index";

import type { Request, Client } from "../types/index";
import type { SearchTypeParams } from "../types/search";

export default class Search {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  async all(params: {
    keyword: string;
    page: number;
    page_size: number;
  }): Promise<{
    [key: string]: any;
  }> {
    const signParams = await this.client.WbiSign(params);
    const res = this.client.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?${signParams}`,
      {
        headers: {
          cookie: `buvid3=${fakeBuvid3()}`,
        },
      }
    );
    return res;
  }
  /**
   * 分类搜索
   * @param {SearchTypeParams} params - 搜索参数
   */
  async type(params: SearchTypeParams): Promise<{
    [key: string]: any;
  }> {
    const signParams = await this.client.WbiSign(params);
    const res = this.client.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/type?${signParams}`,
      {
        headers: {
          cookie: `buvid3=${fakeBuvid3()}`,
        },
      }
    );
    return res;
  }
}
