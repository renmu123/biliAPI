import url from "url";

import axios from "axios";
import type { CreateAxiosDefaults, AxiosRequestConfig } from "axios";
import type { Request } from "~/types/index.d.ts";

export class BaseRequest {
  request: Request;
  constructor(options?: CreateAxiosDefaults) {
    const instance = axios.create({
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/63.0.3239.108",
      },
      ...options,
    });

    instance.interceptors.request.use(config => {
      if (!config.headers.host) {
        config.headers["host"] = url.parse(config.url).hostname;
      }

      return config;
    });
    instance.interceptors.response.use(
      response => {
        return Promise.resolve(response.data);
      },
      error => {
        if (error.response) {
          return error.response;
        } else {
          return Promise.reject(error);
        }
      }
    );
    this.request = instance;
  }
}
