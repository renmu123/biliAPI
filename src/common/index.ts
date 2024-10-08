import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";

export default class Common extends BaseRequest {
  noAuthUseCookie: boolean;
  constructor(auth: Auth = new Auth(), noAuthUseCookie: boolean = false) {
    super(auth);
    this.noAuthUseCookie = noAuthUseCookie;
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

    const res: any = await this.request.get(
      `https://api.bilibili.com/x/kv-frontend/namespace/data`,
      {
        params: defaultParams,
      }
    );
    const areaData: any[] = [];
    Object.entries(res.data).forEach(([key, value]: [string, string]) => {
      if (JSON.parse(value).tid !== undefined) areaData.push(JSON.parse(value));
    });
    return {
      versionId: res.versionId,
      appVersionId: res.appVersionId,
      areaData,
    };
  }
}
