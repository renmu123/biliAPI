import fs from "node:fs";

export default class Auth {
  cookie: string;
  cookieObj: {
    bili_jct: string;
    SESSDATA: string;
    DedeUserID: string | number;
    [key: string]: string | number;
  };
  accessToken?: string;
  uid: number;

  /**
   * 加载cookie文件，仅限TvQrcodeLogin返回的参数
   * @param path cookie文件路径
   */
  async loadCookieFile(path: string) {
    const cookie = await fs.promises.readFile(path, "utf-8");
    const cookieObj = JSON.parse(cookie);

    const cookieStr = cookieObj.cookie_info.cookies
      .map(
        (item: { name: string; value: string }) => `${item.name}=${item.value}`
      )
      .join("; ");
    this.cookie = cookieStr;
    this.cookieObj = cookieObj.cookie_info.cookies.reduce(
      (
        obj: { [key: string]: string },
        item: { name: string; value: string }
      ) => {
        obj[item.name] = item.value;
        return obj;
      },
      {}
    );
    this.accessToken = cookieObj.token_info.access_token;
    this.uid = cookieObj.token_info.mid;
  }

  /**
   * 设置登录相关参数
   */
  setAuth(
    cookie: {
      bili_jct: string;
      SESSDATA: string;
      DedeUserID: string | number;
      [key: string]: string | number;
    },
    accessToken?: string
  ) {
    if (cookie) {
      this.cookieObj = cookie;
      this.cookie = Object.entries(cookie)
        .map(([key, value]) => {
          return `${key}=${value}`;
        })
        .join("; ");
    }

    this.accessToken = accessToken;
    this.uid = Number(this.cookieObj?.DedeUserID);
  }

  /**
   * 登录验证
   * @param [api=["web"]] 用于验证web还是client api
   */
  async authLogin(api: Array<"web" | "client" | "b-cut"> = ["web"]) {
    if (!this.cookieObj) {
      throw new Error("未设置登录参数");
    }
    if (api.includes("web")) {
      const isLogin = !!this.cookie;
      if (!isLogin) {
        throw new Error("接口为web端接口，需要cookie");
      }
    }
    if (api.includes("b-cut")) {
      const isLogin = !!this.cookie;
      if (!isLogin) {
        throw new Error("接口为必剪pc端接口，需要cookie");
      }
    }
    if (api.includes("client")) {
      const isLogin = !!this.accessToken;
      if (!isLogin) {
        throw new Error(
          "接口为客户端接口，需要access_token，请使用客户端登录接口"
        );
      }
    }
  }
}
