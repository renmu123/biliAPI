import fs from "fs";
import url from "url";

import { BiliQrcodeLogin } from "~/user/login.ts";
import User from "~/user/index.ts";

import { BaseRequest } from "~/base/index.ts";
import Live from "~/live/index.ts";
import Platform from "~/platform";

class Client extends BaseRequest {
  cookie: string;
  cookieObj: {
    bili_jct: string;
    [key: string]: string;
  };
  accessToken: string;

  constructor() {
    super();

    this.request.interceptors.request.use(config => {
      if (this.cookie && config.headers["cookie"] === undefined) {
        config.headers["cookie"] = this.cookie;
      }
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }

      return config;
    });
  }
  live = new Live(this);
  user = new User(this);
  platform = new Platform(this);
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
    console.log(this.cookieObj);
    this.accessToken = cookieObj.token_info.access_token;
  }

  // 登录验证
  async authLogin() {
    const isLogin = !!this.cookie;
    if (!isLogin) {
      throw new Error("You need to login first");
    }
  }
}

export { BiliQrcodeLogin, Client };
