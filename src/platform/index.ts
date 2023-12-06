import path from "path";
import { isString } from "~/utils";

import { WebVideoUploader, addMediaClient, addMediaWeb } from "./upload";

import type {
  Request,
  CommonResponse,
  Client,
  MediaOptions,
  MediaPartOptions,
} from "~/types/index.d.ts";
import { MediaDetailReturnType } from "~/types/platform";

export default class Platform {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  async getArchives(params?: {
    keyword?: string; // 关键词
    status?: "is_pubing" | "pubed" | "not_pubed" | "is_pubing,pubed,not_pubed"; // 投稿状态，不传是全部，"is_pubing"是进行中，"pubed"是已通过，"not_pubed"是未通过
    pn: number; // 页码
    ps: number; // 每页数量
    coop?: number; // 未知，传1
    interactive?: number; // 未知，传1
    tid?: number; // 分区id，不传是全部
    order?: "click" | "stow" | "dm_count" | "scores"; // 不传是投稿时间排序，"click"是播放量排序，"stow"是收藏量排序，"dm_count"是弹幕数排序，"scores"是评论排序
  }): Promise<
    CommonResponse<{
      arc_audits: {
        stat: {
          aid: number;
        };
        Archive: {
          cover: string;
          title: string;
          tag: string;
          tid: number;
        };
      }[];
      page: {
        pn: number;
        ps: number;
        count: number;
      };
    }>
  > {
    const defaultParams = {
      pn: 1,
      ps: 20,
      coop: 1,
      interactive: 1,
    };
    return this.request.get("https://member.bilibili.com/x/web/archives", {
      params: {
        pn: 1,
        ps: 20,
        tid: 0,
        keyword: "",
        order: "pubdate",
        jsonp: "jsonp",
        _: Date.now(),
        ...defaultParams,
        ...params,
      },
    });
  }

  /**
   * 检查tag是否可用
   * @param _request 实例
   * @param tag 需要检查的tag
   * @returns
   */
  async checkTag(tag: string): Promise<
    CommonResponse<{
      code: number;
      message: string;
    }>
  > {
    return this.request.get(
      `https://member.bilibili.com/x/vupre/web/topic/tag/check`,
      {
        params: {
          tag: tag,
        },
      }
    );
  }

  /**
   * 投稿视频，推荐使用client api
   * @param filePaths 文件路径
   * @param options
   * @param api
   * @returns
   */
  async uploadMedia(
    filePaths: string[] | MediaPartOptions[],
    options: MediaOptions,
    api: "client" | "web" = "client"
  ): Promise<CommonResponse<{ aid: number; bvid: string }>> {
    this.client.authLogin();

    const mediaOptions: Required<MediaPartOptions[]> = filePaths.map(
      filePath => {
        if (isString(filePath)) {
          return {
            path: filePath as string,
            title: path.parse(filePath as string).name,
          };
        } else {
          if (!(filePath as MediaPartOptions).title) {
            return {
              path: (filePath as MediaPartOptions).path,
              title: path.parse(filePath as string).name,
            };
          } else {
            return filePath as MediaPartOptions;
          }
        }
      }
    );

    console.log(mediaOptions);
    const uploader = new WebVideoUploader(this.request, mediaOptions);
    const videos = await uploader.upload();
    if (api === "client") {
      const res = await addMediaClient(
        this.request,
        videos,
        this.client.accessToken,
        options
      );
      return res;
    } else if (api === "web") {
      const res = await addMediaWeb(
        this.request,
        videos,
        this.client.cookie,
        options
      );
      return res;
    } else {
      throw new Error("You can only set api as client or web");
    }
  }
  async getMediaDetail(
    bvid: string
  ): Promise<CommonResponse<MediaDetailReturnType>> {
    return this.request.get(
      `https://member.bilibili.com/x/vupre/web/archive/view?aid=${bvid}`
    );
  }

  /**
   * 编辑视频，推荐使用client api
   * @param aid 视频id
   * @param mode 编辑模式，append是追加，replace是替换
   * @param filePaths 文件路径
   * @param options
   * @param api
   */
  async editMedia(
    aid: number,
    mode: "append" | "replace",
    filePaths: string[] | MediaPartOptions[],
    options: MediaOptions,
    api: "client" | "web" = "client"
  ) {
    this.client.authLogin();
    const mediaOptions: Required<MediaPartOptions[]> = filePaths.map(
      filePath => {
        if (isString(filePath)) {
          return {
            path: filePath as string,
            title: path.parse(filePath as string).name,
          };
        } else {
          if (!(filePath as MediaPartOptions).title) {
            return {
              path: (filePath as MediaPartOptions).path,
              title: path.parse(filePath as string).name,
            };
          } else {
            return filePath as MediaPartOptions;
          }
        }
      }
    );

    const uploader = new WebVideoUploader(this.request, mediaOptions);
    // const videos = await uploader.upload();

    // if (api === "client") {
    //   const res = await addMediaClient(
    //     this.request,
    //     videos,
    //     this.client.accessToken,
    //     options
    //   );
    //   return res;
    // } else if (api === "web") {
    //   const res = await addMediaWeb(
    //     this.request,
    //     videos,
    //     this.client.cookie,
    //     options
    //   );
    //   return res;
    // } else {
    //   throw new Error("You can only set api as client or web");
    // }
  }
}
