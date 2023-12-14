import type { AxiosInstance } from "axios";
import { Client as ClientClass } from "../index.ts";

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
  cover?: string;
  title: string;
  copyright?: 1 | 2;
  tid: number;
  tag: string;
  desc?: string;
  dynamic?: string;
  dolby?: 0 | 1;
  lossless_music?: 0 | 1;
}

export interface MediaPartOptions {
  path: string;
  title?: string;
}

export type Client = InstanceType<typeof ClientClass>;
