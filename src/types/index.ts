import type { AxiosInstance } from "axios";
import { Client as ClientClass } from "../index.js";

export type Request = AxiosInstance;

export interface CommonResponse<T> {
  code: number;
  message: string;
  ttl: number;
  data: T;
}

export interface UploadResponse<T> {
  data: T;
}

export interface DescV2 {
  raw_text: string;
  /** 1：默认，2：@某人，biz_id为相应uid */
  type: 1 | 2;
  biz_id: string;
}

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

interface _VideoId {
  aid?: number;
  bvid?: string;
}

export type VideoId = RequireAtLeastOne<_VideoId, "aid" | "bvid">;

export interface MediaOptions {
  /** 封面，如果不是http:，会尝试上传 */
  cover?: string;
  /** 标题 */
  title: string;
  /** 1: 自制，2: 转载，转载必须有source字段，且不能超过200字 */
  copyright?: 1 | 2;
  /** copyright=2之后必填的字段 */
  source?: string;
  /** 分区id */
  tid: number;
  /** 标签，用逗号分隔，最多12个 */
  tag: string;
  /** 简介 */
  desc?: string;
  /** 简介中的特殊效果 */
  desc_v2?: DescV2[];
  /** 动态 */
  dynamic?: string;
  /** 杜比音效 */
  dolby?: 0 | 1;
  /** hires音效 */
  lossless_music?: 0 | 1;
  desc_format_id?: number;
  /** 话题id */
  mission_id?: number;
  /** topic_id，需要和mission_id一起使用，topic_name加在tag参数中 */
  topic_id?: number;
  /** 自制声明 0: 允许转载，1：禁止转载 */
  no_reprint?: 0 | 1;
  /** 是否全景 */
  is_360?: -1 | 1;
  /** 关闭弹幕，编辑应该不生效 */
  up_close_danmu?: boolean;
  /** 关闭评论，编辑应该不生效 */
  up_close_reply?: boolean;
  /** 精选评论，编辑应该不生效 */
  up_selection_reply?: boolean;
  /** 充电面板 0: 关闭，1: 开启，编辑应该不生效 */
  open_elec?: 0 | 1;
  /** 是否允许二创：1：允许，-1：不允许 */
  recreate?: 1 | -1;
  /** 是否推送到动态：0：推送，1：不推送 */
  no_disturbance?: 0 | 1;
  /** 仅自己可见：0：公开可见，1：仅自己可见 */
  is_only_self?: 0 | 1;
  /** 创作者声明 */
  neutral_mark?: string;
}

export interface MediaPartOptions {
  path: string;
  title?: string;
}

export type Client = InstanceType<typeof ClientClass>;
