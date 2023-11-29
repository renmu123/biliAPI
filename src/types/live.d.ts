export interface getMasterInfoReturnType {
  /** Information about the user */
  info: {
    /** 主播mid */
    uid: number;
    /** 主播用户名 */
    uname: string;
    /** 主播头像url */
    face: string;
    /** 主播认证信息 */
    official_verify: {
      /** 认证类型: -1: 无, 0: 个人认证, 1: 机构认证 */
      type: number;
      /** 主播认证描述 */
      desc: string;
    };
    /** 主播性别: -1: 保密, 0: 女, 1: 男 */
    gender: number;
  };
  /** User experience information */
  exp: {
    /** Master level information */
    master_level: {
      /** 当前等级 */
      level: number;
      /** 等级框颜色 */
      color: number;
      /** 当前等级信息 [升级积分, 总积分] */
      current: [number, number];
      next: [number, number];
    };
  };
  /** 主播粉丝数 */
  follower_num: number;
  /** 直播间id */
  room_id: number;
  /** 粉丝勋章名 */
  medal_name: string;
  /** 主播荣誉数 */
  glory_count: number;
  /** 直播间头像框url */
  pendant: string;
  /** 0 作用尚不明确 */
  link_group_num: number;
  /** 直播间公告信息 */
  room_news: {
    /** 公告内容 */
    content: string;
    /** 公告时间 */
    ctime: string;
    /** 公告日期 */
    ctime_text: string;
  };
}
