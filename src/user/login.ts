import type { Request, CommonResponse } from "~/types";

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
