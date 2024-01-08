import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";

import type { getMasterInfoReturnType } from "../types/live";

export default class Live extends BaseRequest {
  private noAuthUseCookie: boolean;
  constructor(auth?: Auth, noAuthUseCookie: boolean = false) {
    super(auth);
    this.noAuthUseCookie = noAuthUseCookie;
  }
  /**
   * 获取房间信息
   * @param room_id 房间号
   * @returns
   */
  getRoomInfo(
    room_id: number,
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<{
    /** 用户ID */
    uid: number; // 用户ID
    room_id: number; // 直播间长号
    short_id: number; // 直播间短号，为0表示无短号
    attention: number; // 关注数量
    online: number; // 观看人数
    is_portrait: boolean; // 是否竖屏
    description: string; // 描述
    live_status: 0 | 1 | 2; // 直播状态 (0: 未开播, 1: 直播中, 2: 轮播中)
    area_id: number; // 分区ID
    parent_area_id: number; // 父分区ID
    parent_area_name: string; // 父分区名称
    old_area_id: number; // 旧版分区ID
    background: string; // 背景图片链接
    title: string; // 标题
    user_cover: string; // 封面
    keyframe: string; // 关键帧，用于网页端悬浮展示
    is_strict_room: boolean; // 未知字段，未知含义
    live_time: string; // 直播开始时间，格式为YYYY-MM-DD HH:mm:ss
    tags: string; // 标签，以','分隔
    is_anchor: number; // 未知字段，未知含义
    room_silent_type: string; // 禁言状态
    room_silent_level: number; // 禁言等级
    room_silent_second: number; // 禁言时间，单位是秒
    area_name: string; // 分区名称
    pardants: string; // 未知字段，未知含义
    area_pardants: string; // 未知字段，未知含义
    hot_words: string[]; // 热词，字符串数组
    hot_words_status: number; // 热词状态
    verify: string; // 未知字段，未知含义
    new_pendants: {
      [key: string]: any;
      // 头像框和大V信息
      // 添加头像框和大V相关的属性
    };
    up_session: string; // 未知字段，未知含义
    pk_status: number; // PK状态
    pk_id: number; // PK ID
    battle_id: number; // 未知字段，未知含义
    allow_change_area_time: number; // 允许改变分区的时间
    allow_upload_cover_time: number; // 允许上传封面的时间
    studio_info: {
      // 工作室信息
      status: number;
      master_list: any[];
    };
  }> {
    return this.request.get(
      `https://api.live.bilibili.com/room/v1/Room/get_info`,
      {
        params: {
          room_id: room_id,
        },
        extra: {
          useCookie,
        },
      }
    );
  }

  /**
   *
   * @param {number} params.user_id 用户id
   * @param {number} params.room_id 直播房间号
   * @param {number} [params.page] 页码
   * @param {number} [params.page_size] 数据大小
   * @param {boolean} [useCookie] 是否使用cookie
   * @returns
   */
  getGuardTopList(
    params: {
      user_id: number;
      room_id: number;
      page?: number;
      page_size?: number;
    },
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<{
    [key: string]: any;
  }> {
    return this.request.get(
      `https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topList`,
      {
        params: params,
        extra: {
          useCookie,
        },
      }
    );
  }

  /**
   *
   * @param {number} uid 用户id
   * @param {boolean} [useCookie] 是否使用cookie
   *
   */
  getMasterInfo(
    uid: number,
    useCookie: boolean = this.noAuthUseCookie
  ): Promise<getMasterInfoReturnType> {
    return this.request.get(
      "https://api.live.bilibili.com/live_user/v1/Master/info",
      {
        params: {
          uid: uid,
        },
        extra: {
          useCookie,
        },
      }
    );
  }
}
