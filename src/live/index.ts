import type { Request, CommonResponse } from "~/types";

/**
 * 获取房间信息
 * code=0 表示成功; code!=0 message为失败详情
 * @param _request axios 实例
 * @param room_id 房间号
 * @returns
 */
export function get_room_info(
  _request: Request,
  room_id: number
): Promise<
  CommonResponse<{
    code: number;
    content: string;
  }>
> {
  return _request.get(`https://api.live.bilibili.com/room/v1/Room/get_info`, {
    params: {
      room_id: room_id,
    },
  });
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
export function getGuardTopList(
  _request: Request,
  user_id: number,
  room_id: number,
  page: number = 1,
  page_size: number = 30
) {
  return _request.get(
    `https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topList`,
    {
      params: {
        roomid: room_id,
        ruid: user_id,
        page_size: page_size,
        page: page,
      },
    }
  );
}
