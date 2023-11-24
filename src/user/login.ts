import type { Request, CommonResponse } from "~/types/index.d.ts";
import crypto from "crypto";
import { BaseRequest } from "~/base/index.ts";

/**
 * 获取登录二维码
 * @param _request 实例
 * @returns
 */
export function generate_qrcode(_request: Request): Promise<
  CommonResponse<{
    url: string;
    qrcode_key: string;
  }>
> {
  return _request.get(
    `https://passport.bilibili.com/x/passport-login/web/qrcode/generate?source=main-fe-header`
  );
}

/**
 * 轮询二维码状态
 * @param _request 实例
 * @param qrcode_key generate_qrcode获取的key
 * @returns
 */
export function poll_qrcode(
  _request: Request,
  qrcode_key: string
): Promise<
  CommonResponse<{
    code: 0 | 86101; // 0: 成功; 86101: 待扫码;86038: 二维码已过期;86090: 二维码已扫码未确认
    message: string;
    refresh_token: string;
    timestamp: number;
    url: string;
  }>
> {
  return _request.get(
    `https://passport.bilibili.com/x/passport-login/web/qrcode/poll`,
    {
      params: {
        qrcode_key: qrcode_key,
        source: "main-fe-header",
      },
    }
  );
}

export class BiliQrcodeLogin extends BaseRequest {
  appkey: string;
  secretKey: string;
  session: Request;
  constructor() {
    super();
    this.appkey = "4409e2ce8ffd12b8";
    this.secretKey = "59b43e04ad6965f34319062b478f83dd";
    this.session = this.request;
  }

  async getQrcode(): Promise<
    CommonResponse<{
      url: string;
      auth_code: string;
    }>
  > {
    const params: {
      appkey: string;
      local_id: string;
      ts: number;
      sign?: string;
    } = {
      appkey: this.appkey,
      local_id: "0",
      ts: Math.floor(Date.now() / 1000),
    };

    params.sign = this.generateSign(params);
    console.log("params", params);

    return this.session.post(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
      params
    );
  }

  async poll(auth_code: string) {
    const params: {
      appkey: string;
      auth_code: string;
      local_id: string;
      ts: number;
      sign?: string;
    } = {
      appkey: this.appkey,
      auth_code: auth_code,
      local_id: "0",
      ts: Math.floor(Date.now() / 1000),
    };

    params.sign = this.generateSign(params);

    return new Promise((resolve, reject) => {
      let timer = setInterval(async () => {
        const response = await this.session.post<never, CommonResponse<any>>(
          "http://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
          params
        );
        // 86039 二维码尚未确认
        if (response.code === 0) {
          clearInterval(timer);
          resolve(response);
        } else if (response.code === 86038) {
          clearInterval(timer);
          reject(response.message);
        } else {
          console.log("scaned", response);
        }
      }, 1000);
    });
  }

  generateSign(params: any) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join("&");
    const signString = `${queryString}${this.secretKey}`;
    return crypto.createHash("md5").update(signString).digest("hex");
  }
}
