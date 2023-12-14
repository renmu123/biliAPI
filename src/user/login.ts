import EventEmitter from "node:events";

import { BaseRequest } from "~/base/index.ts";
import { md5 } from "~/utils/index.ts";

import type { Request, CommonResponse } from "~/types/index.d.ts";

const enum Event {
  start = "start",
  scan = "scan",
  completed = "completed",
  error = "error",
  end = "end",
}
/**
 * TV扫码登录
 */
export class TvQrcodeLogin extends BaseRequest {
  private appkey = "4409e2ce8ffd12b8";
  private secretKey = "59b43e04ad6965f34319062b478f83dd";
  private timmer: NodeJS.Timeout | null = null;
  emitter = new EventEmitter();
  constructor() {
    super({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: null,
      },
    });
  }

  /**
   * 获取登录二维码
   */
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

    return this.request.post(
      "http://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
      params
    );
  }
  /**
   * 轮询二维码状态
   * @param auth_code
   */
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
    if (res.code !== 0) {
      throw new Error(res.message);
    }
    const auth_code = res.data.auth_code;

    this.emitter.emit("start");
    let count = 0;
    const timer = setInterval(async () => {
      const response = await this.poll(auth_code);
      // 0：成功
      // 86039 二维码尚未扫描
      // 86038：二维码已失效
      // 86090：二维码已扫码未确认

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

    return res.data.url;
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
  on(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.on(event, callback);
  }
  /**
   * 监听事件，只触发一次
   */
  once(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.once(event, callback);
  }
  /**
   * 移除监听事件
   */
  off(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.off(event, callback);
  }
  /**
   * 移除所有监听事件
   */
  removeAllListeners(event?: keyof typeof Event) {
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
  emitter = new EventEmitter();
  constructor() {
    super({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        cookie: null,
      },
    });
  }

  /**
   * 获取登录二维码
   */
  async getQrcode(): Promise<
    CommonResponse<{
      url: string;
      qrcode_key: string;
    }>
  > {
    return this.request.post(
      "https://passport.bilibili.com/x/passport-login/web/qrcode/generate"
    );
  }
  /**
   * 轮询二维码状态
   * @param auth_code
   */
  poll(qrcode_key: string) {
    return this.request.get<never, CommonResponse<any>>(
      "https://passport.bilibili.com/x/passport-login/web/qrcode/poll",
      {
        params: {
          qrcode_key: qrcode_key,
        },
      }
    );
  }

  async login() {
    const res = await this.getQrcode();
    if (res.code !== 0) {
      throw new Error(res.message);
    }
    const qrcode_key = res.data.qrcode_key;

    this.emitter.emit("start");
    let count = 0;
    const timer = setInterval(async () => {
      const response = await this.poll(qrcode_key);
      // 0：成功
      // 86101 二维码尚未扫描
      // 86038：二维码已失效
      // 86090：二维码已扫码未确认

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
      } else if (response.code === 86101 || response.code === 86090) {
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

    return res.data.url;
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
  on(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.on(event, callback);
  }
  /**
   * 监听事件，只触发一次
   */
  once(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.once(event, callback);
  }
  /**
   * 移除监听事件
   */
  off(event: keyof typeof Event, callback: (response: any) => void) {
    this.emitter.off(event, callback);
  }
  /**
   * 移除所有监听事件
   */
  removeAllListeners(event?: keyof typeof Event) {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}
