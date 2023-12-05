import { WbiSign } from "~/base/sign";
import type { Request, CommonResponse } from "~/types/index.d.ts";
import type {
  MyInfoReturnType,
  GetUserInfoReturnType,
} from "~/types/user.d.ts";

export default class User {
  request: Request;

  constructor(request: Request) {
    this.request = request;
  }
  async getMyInfo(): Promise<CommonResponse<MyInfoReturnType>> {
    return this.request.get("https://api.bilibili.com/x/space/v2/myinfo");
  }
  async getUserInfo(
    uid: number
  ): Promise<CommonResponse<GetUserInfoReturnType>> {
    const signParams = await WbiSign({
      mid: uid,
      token: "",
      platform: "web",
      web_location: "1550101",
    });
    console.log(signParams);

    return this.request.get(
      `https://api.bilibili.com/x/space/wbi/acc/info?${signParams}`,
      {
        headers: {
          cookie: "buvid3=57ADE427-90A8-6E7D-F341-02E62CA23E1B39631infoc",
        },
      }
    );
  }
}
