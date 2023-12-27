import type { AxiosInstance } from "axios";
import { Client as ClientClass } from "../index";

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
  /** 动态 */
  dynamic?: string;
  /** 杜比音效 */
  dolby?: 0 | 1;
  /** hires音效 */
  lossless_music?: 0 | 1;
  desc_format_id?: number;
}

export interface MediaPartOptions {
  path: string;
  title?: string;
}

export type Client = InstanceType<typeof ClientClass>;
