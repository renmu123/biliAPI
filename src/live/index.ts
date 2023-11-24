import type { Request, CommonResponse } from "~/types/index.d.ts";

export default class Live {
  request: Request;

  constructor(request: Request) {
    this.request = request;
  }
  /**
   * 获取房间信息
   * code=0 表示成功; code!=0 message为失败详情
   * @param _request axios 实例
   * @param room_id 房间号
   * @returns
   */
  get_room_info(room_id: number): Promise<
    CommonResponse<{
      code: number;
      content: string;
    }>
  > {
    return this.request.get(
      `https://api.live.bilibili.com/room/v1/Room/get_info`,
      {
        params: {
          room_id: room_id,
        },
        headers: {
          cookie: null,
        },
      }
    );
  }

  /**
   *
   * @param _request 实例
   * @param user_id 用户id
   * @param room_id 直播房间号
   * @param page 页码
   * @param page_size 数据大小
   * @returns
   */
  getGuardTopList(params: {
    user_id: number;
    room_id: number;
    page?: number;
    page_size?: number;
  }) {
    return this.request.get(
      `https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topList`,
      {
        params: params,
        headers: {
          cookie: null,
        },
      }
    );
  }
}
