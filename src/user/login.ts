import type { Request, CommonResponse } from "~/types/index.d.ts";
import crypto from "crypto";
import { BaseRequest } from "~/base/index.ts";
import EventEmitter from "events";

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

const enum Event {
  start = "start",
  scan = "scan",
  completed = "completed",
  error = "error",
  end = "end",
}
export class TvQrcodeLogin extends BaseRequest {
  private appkey: string;
  private secretKey: string;
  private emitter: EventEmitter;
  constructor() {
    super();
    this.appkey = "4409e2ce8ffd12b8";
    this.secretKey = "59b43e04ad6965f34319062b478f83dd";
    this.emitter = new EventEmitter();
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

    return this.request.post(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
      params
    );
  }
  poll(auth_code: string) {
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
    return this.request.post<never, CommonResponse<any>>(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
      params
    );
  }

  async login() {
    const res = await this.getQrcode();
    console.log(res);
    if (res.code !== 0) {
      throw new Error(res.message);
    }
    const auth_code = res.data.auth_code;

    this.emitter.emit("start");
    const timer = setInterval(async () => {
      const response = await this.poll(auth_code);
      // 0：成功
      // 86039 二维码尚未确认
      // 86038：二维码已失效
      // 86090：二维码已扫码未确认

      if (response.code === 0) {
        clearInterval(timer);
        this.emitter.emit(Event.completed, response);
      } else if (response.code === 86038) {
        clearInterval(timer);
        this.emitter.emit(Event.end, response);
        this.emitter.emit(Event.error, response);
      } else if (response.code === 86039 || response.code === 86090) {
        this.emitter.emit(Event.scan, response);
      } else {
        clearInterval(timer);
        this.emitter.emit(Event.end, response);
        this.emitter.emit(Event.error, response);
      }
    }, 1000);

    return res.data.url;
  }
  on(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.on(event, callback);
  }

  generateSign(params: any) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join("&");
    const signString = `${queryString}${this.secretKey}`;
    return crypto.createHash("md5").update(signString).digest("hex");
  }
}
