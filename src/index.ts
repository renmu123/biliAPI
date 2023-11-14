import fs from "fs";
import url from "url";

import axios from "axios";
import type { Request } from "~/types";
import { checkTag } from "~/member/index.ts";
import { generate_qrcode, poll_qrcode } from "~/user/login.ts";
import { upload } from "~/media/upload.ts";

export default class Client {
  request: Request;
  cookie: string;

  constructor(cookie?: string, requestOptions = {}) {
    this.cookie = cookie;
    this.request = axios.create({
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/63.0.3239.108",
      },
      ...requestOptions,
    });

    this.request.interceptors.request.use(config => {
      if (this.cookie) {
        config.headers["cookie"] = this.cookie;
      }
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }
      return config;
    });
  }
  load_cookie(filePath: string) {
    this.cookie = fs.readFileSync(filePath, "utf-8");
  }
  save_cookie(filePath: string, cookie: string | string[]) {
    if (Array.isArray(cookie)) {
      this.cookie = cookie.join(";");
    } else {
      this.cookie = cookie;
    }
    fs.writeFileSync(filePath, this.cookie);
  }
  async checkTag(tag: string) {
    return checkTag(this.request, tag);
  }
  generate_qrcode() {
    return generate_qrcode(this.request);
  }
  poll_qrcode(qrcode_key: string) {
    return poll_qrcode(this.request, qrcode_key);
  }
  upload(filePath: string, options: any) {
    return upload(this.request, this.cookie, filePath, options);
  }
}

function RequireLogin() {
  return (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) => {
    console.log(target.prototype.cookie, propertyName, descriptor);

    const originalMethod = descriptor.value;

    // 修改原始方法，添加登录检查逻辑
    descriptor.value = function (...args: any[]) {
      // 这里可以添加你的登录检查逻辑
      if (target.cookie) {
        return originalMethod.apply(this, args);
      } else {
        throw new Error("请先进行登录");
      }
    };
    return descriptor;
  };
}
