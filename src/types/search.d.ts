/**
 * 视频：video
 * 番剧：media_bangumi
 * 影视：media_ft
 * 直播间及主播：live
 * 直播间：live_room
 * 主播：live_user
 * 专栏：article
 * 话题：topic
 * 用户：bili_user
 * 相簿：photo
 */
type SearchType =
  | "video"
  | "media_bangumi"
  | "media_ft"
  | "live"
  | "live_room"
  | "live_user"
  | "article"
  | "topic"
  | "bili_user"
  | "photo";

/**
 * 搜索类型为视频、专栏及相簿时：
 * 默认为totalrank
 * 综合排序：totalrank
 * 最多点击：click
 * 最新发布：pubdate
 * 最多弹幕：dm
 * 最多收藏：stow
 * 最多评论：scores
 * 最多喜欢：attention（仅用于专栏）
 * ----------------------------
 */
type OrderTypeVideo =
  | "totalrank"
  | "click"
  | "pubdate"
  | "dm"
  | "stow"
  | "scores"
  | "attention";

/**
 *  搜索结果为直播间时：
 * 默认为online
 * 人气直播：online
 * 最新开播：live_time
 */
type OrderTypeLive = "online" | "live_time";

/**
 * 搜索结果为用户时：
 * 默认为0
 * 默认排序：0
 * 粉丝数：fans
 * 用户等级：level
 */
type OrderTypeUser = "0" | "fans" | "level";

/**
 * 仅用于搜索用户
 * 默认为0
 * 由高到低：0
 * 由低到高：1
 */
type OrderSortType = "0" | "1";

/**
 *仅用于搜索用户
 * 默认为0
 * 全部用户：0
 * up主：1
 * 普通用户：2
 * 认证用户：3
 */
type UserType = "0" | "1" | "2" | "3";

/**
 * 仅用于搜索视频
 * 默认为0
 * 全部时长：0
 * 10分钟以下：1
 * 10-30分钟：2
 * 30-60分钟：3
 * 60分钟以上：4
 */
type DurationType = "0" | "1" | "2" | "3" | "4";

/**
 * 仅用于搜索视频
 * 默认为0
 * 全部分区：0
 * 筛选分区：目标分区tid
 */
type TidsType = "0" | number;

/**
 * 搜索结果为专栏时：
 * 默认为0
 * 全部分区：0
 * 动画：2
 * 游戏：1
 * 影视：28
 * 生活：3
 * 兴趣：29
 * 轻小说：16
 * 科技：17
 * --------
 * 搜索结果为相簿时：
 * 默认为0
 * 全部分区：0
 * 画友：1
 * 摄影：2
 */
type CategoryIdType = "0" | "2" | "1" | "28" | "3" | "29" | "16" | "17";

export type SearchTypeParams = {
  /* 搜索类型 */
  search_type: SearchType;
  keyword: string;
  order?: OrderTypeVideo | OrderTypeLive | OrderTypeUser;
  order_sort?: OrderSortType;
  user_type?: UserType;
  duration?: DurationType;
  tids?: TidsType;
  category_id?: CategoryIdType;
  page?: number;
};
