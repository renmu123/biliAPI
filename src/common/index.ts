import type { Request, CommonResponse, Client } from "~/types/index.d.ts";
import type { SearchTypeParams } from "~/types/search.d.ts";

export default class Common {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  /**
   * 获取分区
   */
  async getAreas(params?: {
    appKey?: string;
    versionId?: string;
    nscode?: number;
  }) {
    const defaultParams: {
      appKey: string;
      versionId: string;
      nscode: number;
    } = {
      appKey: "333.1339",
      versionId: undefined,
      nscode: 2,
      ...params,
    };
    // https://api.bilibili.com/x/kv-frontend/namespace/data?appKey=333.1339&versionId=undefined&nscode=2

    const res = await this.client.request.get(
      `https://api.bilibili.com/x/kv-frontend/namespace/data`,
      {
        params: defaultParams,
      }
    );
    const areaData: any[] = [];
    Object.entries(res.data.data).forEach(([key, value]: [string, string]) => {
      if (JSON.parse(value).tid !== undefined) areaData.push(JSON.parse(value));
    });
    return {
      versionId: res.data.versionId,
      appVersionId: res.data.appVersionId,
      areaData,
    };
  }
}
