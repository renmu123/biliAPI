import type { AxiosInstance, AxiosResponse } from "axios";

export type Request = AxiosInstance;

export interface CommonResponse<T> extends AxiosResponse {
  data: {
    code: number;
    message: string;
    ttl: number;
    data: T;
  };
}

export interface UploadResponse<T> extends AxiosResponse {
  data: T;
}

export interface MediaOptions {
  cover?: string;
  title: string;
  copyright?: 0 | 1;
  tid: number;
  tag: string;
  desc?: string;
  dynamic?: string;
  dolby?: 0 | 1;
  lossless_music?: 0 | 1;
}
