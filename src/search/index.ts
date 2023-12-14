import type { Request, CommonResponse, Client } from "../types/index";
import type { SearchTypeParams } from "../types/search";

export default class Search {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  async all(params: { keyword: string; page: number; page_size: number }) {
    const signParams = await this.client.WbiSign(params);
    const res = this.client.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/all/v2?${signParams}`,
      {
        headers: {
          cookie: "buvid3=57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc",
        },
      }
    );
    return res;
  }
  /**
   * 分类搜索
   * @param {SearchTypeParams} params - 搜索参数
   */
  async type(params: SearchTypeParams) {
    const signParams = await this.client.WbiSign(params);
    const res = this.client.request.get(
      `https://api.bilibili.com/x/web-interface/wbi/search/type?${signParams}`,
      {
        headers: {
          cookie: "buvid3=57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc",
        },
      }
    );
    return res;
  }
}
