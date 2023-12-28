import path from "node:path";
import PQueue from "p-queue";
import EventEmitter from "events";

import { isString, readFileAsBase64 } from "../utils";
import { WebVideoUploader } from "./upload";
import { getFileSize, sum } from "../utils/index";

import type {
  Request,
  CommonResponse,
  Client,
  MediaOptions,
  MediaPartOptions,
} from "../types/index";
import {
  MediaDetailReturnType,
  getArchivesReturnType,
  UploaderType,
  SubmitType,
} from "../types/platform";

export default class Platform {
  request: Request;
  client: Client;

  constructor(client: Client) {
    this.request = client.request;
    this.client = client;
  }
  /**
   * 获取投稿列表
   * 该接口需要登录
   * @param params.keyword 关键词
   * @param params.status 投稿状态，不传是全部，"is_pubing"是进行中，"pubed"是已通过，"not_pubed"是未通过
   * @param params.pn 页码
   * @param params.ps 每页数量
   * @param params.coop 未知，传1
   * @param params.interactive 未知，传1
   * @param params.tid 分区id，不传是全部
   * @param params.order 不传是投稿时间排序，"click"是播放量排序，"stow"是收藏量排序，"dm_count"是弹幕数排序，"scores"是评论排序
   * @returns
   *
   */
  async getArchives(params?: {
    keyword?: string;
    status?: "is_pubing" | "pubed" | "not_pubed" | "is_pubing,pubed,not_pubed";
    pn: number;
    ps: number;
    coop?: number;
    interactive?: number;
    tid?: number;
    order?: "click" | "stow" | "dm_count" | "scores";
  }): Promise<CommonResponse<getArchivesReturnType>> {
    this.client.authLogin();
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
   * @param tag 需要检查的tag
   * @returns
   */
  async checkTag(tag: string): Promise<
    CommonResponse<{
      code: number;
      message: string;
    }>
  > {
    this.client.authLogin();
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
   * 上传
   */
  private async _upload(filePaths: string[] | MediaPartOptions[]): Promise<{
    emitter: EventEmitter;
    queue: PQueue;
    videos: {
      cid: number;
      filename: string;
      title: string;
    }[];
    pause: () => void;
    start: () => void;
    cancel: () => void;
  }> {
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
    const queue = new PQueue({ concurrency: 1 });
    const emitter = new EventEmitter();

    const uploadTasks: WebVideoUploader[] = [];
    for (let i = 0; i < mediaOptions.length; i++) {
      const uploader = new WebVideoUploader(this.request);
      uploadTasks.push(uploader);
      queue.add(() => uploader.upload(mediaOptions[i]));
    }

    const totalSize = sum(
      await Promise.all(
        mediaOptions.map(option => option.path).map(getFileSize)
      )
    );
    let totalUploaded: {
      [key: number]: number;
    } = {};

    uploadTasks.map((uploader, index) => {
      uploader.emitter.on("progress", (progress: any) => {
        if (progress.event !== "uploading") return;

        const { loaded } = progress.data;
        totalUploaded[index] = loaded;
        const totalUploadedSize = sum(Object.values(totalUploaded));

        emitter.emit("progress", {
          progress: totalUploadedSize / totalSize,
          totalUploadedSize: totalUploadedSize,
          totalSize: totalSize,
        });
      });
    });

    const videos: {
      cid: number;
      filename: string;
      title: string;
    }[] = [];
    queue.on("completed", data => {
      videos.push(data);
    });

    queue.on("error", err => {
      emitter.emit("error", err);
    });

    const pause = () => {
      uploadTasks.map(uploader => uploader.pause());
    };
    const start = () => {
      uploadTasks.map(uploader => uploader.start());
    };
    const cancel = () => {
      uploadTasks.map(uploader => uploader.cancel());
    };

    return {
      emitter: emitter,
      queue: queue,
      videos,
      pause,
      start,
      cancel,
    };
  }
  /**
   * 投稿视频，推荐submit使用client参数
   * on("completed", data => {})可以监听上传完成
   * @param filePaths 文件路径
   * @param options
   * @param api
   * @returns
   */
  async addMedia(
    filePaths: string[] | MediaPartOptions[],
    options: MediaOptions,
    api: {
      uploader: UploaderType;
      submit: SubmitType;
    } = {
      uploader: "web",
      submit: "client",
    }
  ) {
    this.client.authLogin([api.submit, api.uploader]);
    this.checkOptions(options);

    const { emitter, queue, videos, pause, start, cancel } = await this._upload(
      filePaths
    );

    queue.on("idle", async () => {
      if (api.submit === "client") {
        const res = await this.addMediaClientApi(videos, options);
        emitter.emit("completed", res);
      } else if (api.submit === "web") {
        const res = await this.addMediaWebApi(videos, options);
        emitter.emit("completed", res);
      } else if (api.submit === "b-cut") {
        const res = await this.addMediaBCutApi(videos, options);
        emitter.emit("completed", res);
      } else {
        emitter.emit("error", "You can only set api as client or web");
        throw new Error("You can only set api as client or web");
      }
    });

    return {
      ...emitter,
      pause,
      start,
      cancel,
    };
  }
  /**
   * 投稿视频，推荐submit使用client参数
   * @param filePaths 文件路径
   * @param options
   * @param api
   * @returns
   */
  async onAddMedia(
    filePaths: string[] | MediaPartOptions[],
    options: MediaOptions,
    api: {
      uploader: UploaderType;
      submit: SubmitType;
    } = {
      uploader: "web",
      submit: "client",
    }
  ): Promise<CommonResponse<{ aid: number; bvid: string }>> {
    return new Promise(async (resolve, reject) => {
      const task = await this.addMedia(filePaths, options, api);
      task.on("completed", res => {
        resolve(res);
      });
      task.on("error", err => {
        reject(err);
      });
    });
  }
  /**
   * 投稿视频详情，bvid和aid必须传一个
   * @param bvid 视频bvid
   * @param aid 视频aid
   */
  async getArchive({
    bvid,
    aid,
  }: {
    bvid?: string;
    aid?: number;
  }): Promise<CommonResponse<MediaDetailReturnType>> {
    const params = {
      bvid: bvid,
      aid: aid,
    };
    return this.request.get(
      `https://member.bilibili.com/x/vupre/web/archive/view`,
      {
        params: params,
      }
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
    filePaths: string[] | MediaPartOptions[] = [],
    options: Partial<MediaOptions> = {},
    mode: "append" | "replace" = "append",
    api: {
      uploader: UploaderType;
      submit: "web" | "client";
    } = {
      uploader: "web",
      submit: "client",
    }
  ) {
    this.client.authLogin();
    const { emitter, queue, videos, pause, start, cancel } = await this._upload(
      filePaths
    );

    queue.on("idle", async () => {
      if (api.submit === "client") {
        // const res = await this.addMediaClientApi(videos, options);
        throw new Error("You can only set api as web");
      } else if (api.submit === "web") {
        const res = await this.editMediaWebApi(
          videos,
          { aid: aid, ...options },
          mode
        );
        emitter.emit("completed", res);
      } else {
        emitter.emit("error", "You can only set api as client or web");
        throw new Error("You can only set api as client or web");
      }
    });
    return {
      ...emitter,
      pause,
      start,
      cancel,
    };
  }

  /**
   * 编辑视频，推荐使用client api
   * @param aid 视频id
   * @param mode 编辑模式，append是追加，replace是替换
   * @param filePaths 文件路径
   * @param options
   * @param api
   */
  async onEditMedia(
    aid: number,
    filePaths: string[] | MediaPartOptions[] = [],
    options: Partial<MediaOptions> = {},
    mode: "append" | "replace" = "append",
    api: {
      uploader: UploaderType;
      submit: "web" | "client";
    } = {
      uploader: "web",
      submit: "client",
    }
  ): Promise<CommonResponse<{ aid: number; bvid: string }>> {
    return new Promise(async (resolve, reject) => {
      const task = await this.editMedia(aid, filePaths, options, mode, api);
      task.on("completed", res => {
        resolve(res);
      });
      task.on("error", err => {
        reject(err);
      });
    });
  }

  /**
   * 通过client api投稿视频
   */
  async addMediaClientApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: MediaOptions
  ): Promise<
    CommonResponse<{
      aid: number;
      bvid: string;
    }>
  > {
    this.client.authLogin(["client"]);
    this.checkOptions(options);
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 9999,
      desc: "",
      recreate: -1,
      dynamic: "",
      interactive: 0,
      videos: videos,
      act_reserve_create: 0,
      no_disturbance: 0,
      no_reprint: 1,
      subtitle: { open: 0, lan: "" },
      dolby: 0,
      lossless_music: 0,
      up_selection_reply: false,
      up_close_reply: false,
      up_close_danmu: false,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.data.url;
    }

    console.log("submit", data);

    return this.request.post(
      "http://member.bilibili.com/x/vu/client/add",
      data,
      {
        params: {
          access_key: this.client.accessToken,
        },
      }
    );
  }

  /**
   * 通过必剪 api投稿视频
   */
  async addMediaBCutApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: MediaOptions
  ): Promise<
    CommonResponse<{
      aid: number;
      bvid: string;
    }>
  > {
    this.client.authLogin();
    this.checkOptions(options);
    const csrf = this.client.cookieObj.bili_jct;
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 9999,
      desc: "",
      recreate: -1,
      dynamic: "",
      interactive: 0,
      videos: videos,
      act_reserve_create: 0,
      no_disturbance: 0,
      no_reprint: 1,
      subtitle: { open: 0, lan: "" },
      dolby: 0,
      lossless_music: 0,
      up_selection_reply: false,
      up_close_reply: false,
      up_close_danmu: false,
      web_os: 1,
      csrf: csrf,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.data.url;
    }

    console.log("submit", data);

    return this.request.post(
      "https://member.bilibili.com/x/vu/mvp/pc/add",
      data,
      {
        headers: {
          "User-Agent": "bcut-pc build:12911853",
        },
        params: {
          csrf: csrf,
          platform: "BcutPc-windows",
          build: "12911853",
        },
      }
    );
  }

  /**
   * 通过web api投稿视频
   */
  async addMediaWebApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: MediaOptions
  ): Promise<
    CommonResponse<{
      aid: number;
      bvid: string;
    }>
  > {
    this.client.authLogin();
    this.checkOptions(options);
    const csrf = this.client.cookieObj.bili_jct;
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 9999,
      desc: "",
      recreate: -1,
      dynamic: "",
      interactive: 0,
      videos: videos,
      act_reserve_create: 0,
      no_disturbance: 0,
      no_reprint: 1,
      subtitle: { open: 0, lan: "" },
      dolby: 0,
      lossless_music: 0,
      up_selection_reply: false,
      up_close_reply: false,
      up_close_danmu: false,
      web_os: 1,
      csrf: csrf,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.data.url;
    }

    console.log("submit", data);

    return this.request.post("https://member.bilibili.com/x/vu/web/add", data, {
      params: {
        t: Date.now(),
        csrf: csrf,
      },
    });
  }

  /**
   * 通过web api接口编辑视频
   */
  async editMediaWebApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: Partial<MediaOptions> & { aid: number },
    mode: "append" | "replace"
  ): Promise<
    CommonResponse<{
      aid: number;
      bvid: string;
    }>
  > {
    this.client.authLogin();
    const archive = (
      await this.getArchive({
        aid: options.aid,
      })
    ).data;

    const csrf = this.client.cookieObj.bili_jct;
    const data: MediaOptions & {
      csrf: string;
      videos: { cid: number; filename: string; title: string; desc?: string }[];
    } = {
      videos: [],
      ...archive.archive,
      csrf: csrf,
      ...options,
    };
    this.checkOptions(options);

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.data.url;
    }
    if (mode === "append") {
      data.videos = [...archive.videos, ...videos];
    } else if (mode === "replace") {
      data.videos = videos;
    } else {
      throw new Error("mode can only be append or replace");
    }

    console.log("edit submit", data);

    return this.request.post(
      "https://member.bilibili.com/x/vu/web/edit",
      data,
      {
        params: {
          t: Date.now(),
          csrf: csrf,
        },
      }
    );
  }

  /**
   * 上传封面
   * @param filePath 文件路径
   */
  async uploadCover(
    filePath: string
  ): Promise<CommonResponse<{ url: string }>> {
    this.client.authLogin();

    return this.request.post(
      "https://member.bilibili.com/x/vu/web/cover/up",
      {
        cover: await readFileAsBase64(filePath),
        csrf: this.client.cookieObj.bili_jct,
      },
      {
        params: { t: Date.now() },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  }

  /**
   * 获取上传模板
   */
  async getUploadTemplateList(): Promise<
    CommonResponse<{
      tid: number;
      name: string;
      typeid: number;
      title: string;
      tags: string;
      description: string;
      copyright: 1 | 2;
      attribute: 0 | number;
      is_default: 0 | 1;
    }>
  > {
    this.client.authLogin();
    return this.request.get("https://member.bilibili.com/x/vupre/web/tpls", {
      params: {
        t: Date.now(),
      },
    });
  }
  /**
   * 编辑上传模板
   */
  async editUploadTemplate(
    /** 主键，列表接口获取 */
    tid: number,
    options: Partial<{
      /** 模板名称 */
      name: string;
      /** 标题 */
      title: string;
      /** 标签 */
      keywords: string;
      /** 描述 */
      description: string;
      /** 分区id */
      typeid: number;
      /** Original: 自制，Copy: 转载 */
      arctype: "Original" | "Copy";
      /** 0: 不设为默认，1: 设置默认 */
      is_default: 0 | 1;
    }> = {}
  ): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    return this.request.post(
      "https://member.bilibili.com/x/vupre/web/tpl/update",
      {
        tid: tid,
        ...options,
        crsf: this.client.cookieObj.bili_jct,
      },
      {
        params: {
          t: Date.now(),
        },
      }
    );
  }

  checkOptions(options: Partial<MediaOptions>) {
    if (!options.title) throw new Error("title is required");
    if (!options.tag) throw new Error("tag is required");
    if (!options.tid) throw new Error("tid is required");
    if (options.copyright === 2) {
      if (!options.source)
        throw new Error("source is required when you set copyrigth as 2");
      if (options.source.length > 200)
        throw new Error("source can not be longer than 200 characters");
    }
    return true;
  }
  /**
   * 获取推荐标签
   * subtype,title,description三个参数对结果影响较大
   */
  async getRecommendTags(params?: {
    /** 不知道是啥 */
    upload_id?: string;
    /** 分区id */
    subtype?: number;
    /** 视频标题 */
    title?: string;
    /** 分p的filename */
    filenmae?: string;
    /** 视频描述 */
    description?: string;
    /** 封面地址 */
    cover_url?: string;
  }): Promise<
    CommonResponse<
      {
        tag: string;
        checked: number;
        request_id: string;
      }[]
    >
  > {
    this.client.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/tag/recommend",
      {
        params: params,
      }
    );
  }

  /**
   * 查询话题
   */
  async getTopic(
    params: {
      /** 分区id */
      type_id?: number;
      /** 页码，从0开始 */
      pn: number;
      /** 个数 */
      ps: number;
      /** 视频标题 */
      title?: string;
    } = {
      pn: 0,
      ps: 20,
    }
  ): Promise<
    CommonResponse<
      {
        topic_id: number;
        topic_name: string;
        description: string;
        mission_id: number;
        activity_text: string;
        activity_description: string;
      }[]
    >
  > {
    this.client.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/topic/type",
      {
        params: params,
      }
    );
  }
}
