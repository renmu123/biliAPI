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
