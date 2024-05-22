import EventEmitter from "node:events";

import { BaseRequest } from "../base/index";
import { md5 } from "../utils/index";
import { TypedEmitter } from "tiny-typed-emitter";

import type { CommonResponse } from "../types/index";

const enum Event {
  start = "start",
  scan = "scan",
  completed = "completed",
  error = "error",
  end = "end",
}

interface TvLoginResponse {
  /** 0：成功;86039: 二维码尚未扫描;86038：二维码已失效;86090：二维码已扫码未确认 */
  code: 0 | 86039 | 86038 | 86090;
  message: string;
  ttl: 1;
  data: any | null;
}
interface TvEmitterEvents {
  [Event.start]: () => void;
  [Event.scan]: (response: TvLoginResponse) => void;
  [Event.completed]: (response: TvLoginResponse) => void;
  [Event.error]: (response: TvLoginResponse) => void;
  [Event.end]: (response: TvLoginResponse) => void;
}

type WebLoginResponse = CommonResponse<{
  url: string;
  refresh_token: string;
  timestamp: number;
  /** 0：成功;86101:二维码尚未扫描;86038：二维码已失效;86090：二维码已扫码未确认 */
  code: 0 | 86101 | 86038 | 86090;
  message: string;
}>;
interface WebCompleteResponse {
  DedeUserID: string;
  DedeUserID__ckMd5: string;
  Expires: string;
  SESSDATA: string;
  bili_jct: string;
  gourl: string;
  first_domain: string;
  refresh_token: string;
}
interface WebEmitterEvents {
  [Event.start]: () => void;
  [Event.scan]: (response: WebLoginResponse) => void;
  [Event.completed]: (response: WebCompleteResponse) => void;
  [Event.error]: (response: WebLoginResponse) => void;
  [Event.end]: (response: WebLoginResponse) => void;
}

/**
 * TV扫码登录
 */
export class TvQrcodeLogin extends BaseRequest {
  private appkey = "4409e2ce8ffd12b8";
  private secretKey = "59b43e04ad6965f34319062b478f83dd";
  private timmer: NodeJS.Timeout | null = null;
  emitter = new EventEmitter() as TypedEmitter<TvEmitterEvents>;

  constructor() {
    super(undefined, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: null,
      },
    });
  }

  /**
   * 获取登录二维码
   */
  async getQrcode(): Promise<{
    url: string;
    auth_code: string;
  }> {
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

    return this.request.post(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
      params
    );
  }
  /**
   * 轮询二维码状态
   * @param auth_code
   */
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
    const res = await this.request.post<never, CommonResponse<TvLoginResponse>>(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
      params,
      {
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
  }

  async login() {
    const data = await this.getQrcode();
    const auth_code = data.auth_code;

    this.emitter.emit(Event.start);
    let count = 0;
    const timer = setInterval(async () => {
      const response = await this.poll(auth_code);
      if (response.code === 0) {
        this.emitter.emit(Event.completed, response);
        this.emitter.emit(Event.end, response);
        clearInterval(timer);
        this.removeAllListeners();
      } else if (response.code === 86038) {
        this.emitter.emit(Event.end, response);
        this.emitter.emit(Event.error, response);
        clearInterval(timer);
        this.removeAllListeners();
      } else if (response.code === 86039 || response.code === 86090) {
        this.emitter.emit(Event.scan, response);
      } else {
        this.emitter.emit(Event.end, response);
        this.emitter.emit(Event.error, response);
        clearInterval(timer);
        this.removeAllListeners();
      }
      count++;
      if (count > 180) {
        this.emitter.emit(Event.end, {
          code: 86038,
          message: "二维码已失效",
          ttl: 1,
          data: null,
        });
        this.emitter.emit(Event.error, {
          code: 86038,
          message: "二维码已失效",
          ttl: 1,
          data: null,
        });
        clearInterval(timer);
        this.emitter.emit(Event.end, response);
      }
    }, 1000);
    this.timmer = timer;

    return data.url;
  }
  /**
   * 中断任务，并清除所有监听器
   */
  interrupt() {
    clearInterval(this.timmer);
    this.removeAllListeners();
  }
  /**
   * 监听事件
   */
  on(event: keyof TvEmitterEvents, callback: (response: any) => void) {
    this.emitter.on(event, callback);
  }
  /**
   * 监听事件，只触发一次
   */
  once(event: keyof TvEmitterEvents, callback: (response: any) => void) {
    this.emitter.once(event, callback);
  }
  /**
   * 移除监听事件
   */
  off(event: keyof TvEmitterEvents, callback: (response: any) => void) {
    this.emitter.off(event, callback);
  }
  /**
   * 移除所有监听事件
   */
  removeAllListeners(event?: keyof TvEmitterEvents) {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * 生成签名
   * @param params 签名参数
   */
  generateSign(params: any) {
    const queryString = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join("&");
    const signString = `${queryString}${this.secretKey}`;
    return md5(signString);
  }
}

/**
 * 网页扫码登录
 */
export class WebQrcodeLogin extends BaseRequest {
  private timmer: NodeJS.Timeout | null = null;
  emitter = new EventEmitter() as TypedEmitter<WebEmitterEvents>;
  constructor() {
    super(undefined, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: null,
      },
    });
  }

  /**
   * 获取登录二维码
   */
  async getQrcode(): Promise<{
    url: string;
    qrcode_key: string;
  }> {
    return this.request.get(
      "https://passport.bilibili.com/x/passport-login/web/qrcode/generate"
    );
  }
  /**
   * 轮询二维码状态
   * @param auth_code
   */
  async poll(qrcode_key: string): Promise<WebLoginResponse> {
    const res = await this.request.get(
      "https://passport.bilibili.com/x/passport-login/web/qrcode/poll",
      {
        params: {
          qrcode_key: qrcode_key,
        },
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
  }

  async login() {
    function paramsToObject(entries: any) {
      const result: {
        [key: string]: any;
      } = {};
      for (const [key, value] of entries) {
        // each 'entry' is a [key, value] tupple
        result[key] = value;
      }
      return result;
    }

    const data = await this.getQrcode();
    const qrcode_key = data.qrcode_key;

    this.emitter.emit(Event.start);
    let count = 0;
    const timer = setInterval(async () => {
      const res = await this.poll(qrcode_key);
      const response = res.data;
      if (response.code === 0) {
        const url = new URL(response.url);
        const data = {
          ...paramsToObject(url.searchParams.entries()),
          refresh_token: response.refresh_token,
        } as WebCompleteResponse;
        this.emitter.emit(Event.completed, data);
        this.emitter.emit(Event.end, res);
        clearInterval(timer);
        this.removeAllListeners();
      } else if (response.code === 86038) {
        this.emitter.emit(Event.end, res);
        this.emitter.emit(Event.error, res);
        clearInterval(timer);
        this.removeAllListeners();
      } else if (response.code === 86101 || response.code === 86090) {
        this.emitter.emit(Event.scan, res);
      } else {
        this.emitter.emit(Event.end, res);
        this.emitter.emit(Event.error, res);
        clearInterval(timer);
        this.removeAllListeners();
      }
      count++;
      if (count > 180) {
        this.emitter.emit(Event.end, {
          code: 86038,
          message: "二维码已失效",
          ttl: 1,
          data: null,
        });
        this.emitter.emit(Event.error, {
          code: 86038,
          message: "二维码已失效",
          ttl: 1,
          data: null,
        });
        clearInterval(timer);
        this.emitter.emit(Event.end, res);
      }
    }, 1000);
    this.timmer = timer;

    return data.url;
  }
  /**
   * 中断任务，并清除所有监听器
   */
  interrupt() {
    clearInterval(this.timmer);
    this.removeAllListeners();
  }
  /**
   * 监听事件
   */
  on(event: keyof WebEmitterEvents, callback: (response: any) => void) {
    this.emitter.on(event, callback);
  }
  /**
   * 监听事件，只触发一次
   */
  once(event: keyof WebEmitterEvents, callback: (response: any) => void) {
    this.emitter.once(event, callback);
  }
  /**
   * 移除监听事件
   */
  off(event: keyof WebEmitterEvents, callback: (response: any) => void) {
    this.emitter.off(event, callback);
  }
  /**
   * 移除所有监听事件
   */
  removeAllListeners(event?: keyof WebEmitterEvents) {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}
