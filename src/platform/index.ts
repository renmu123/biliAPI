import path from "node:path";
import PQueue from "p-queue";
import EventEmitter from "node:events";

import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import { isString, readFileAsBase64 } from "../utils/index.js";
import { WebVideoUploader } from "./upload.js";
import { getFileSize, sum, retry } from "../utils/index.js";

import type { MediaOptions, MediaPartOptions, DescV2 } from "../types/index.js";
import {
  MediaDetailReturnType,
  getArchivesReturnType,
  UploaderType,
  SubmitType,
  getSeasonListReturnType,
  Season,
  Section,
  ArchivePreReturnType,
} from "../types/platform.js";

export default class Platform extends BaseRequest {
  constructor(auth: Auth = new Auth()) {
    super(auth);
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
  }): Promise<getArchivesReturnType> {
    this.auth.authLogin();
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
  async checkTag(tag: string): Promise<{
    code: number;
    message: string;
    data: {
      code: number;
      content: string;
    };
  }> {
    this.auth.authLogin();
    const res = await this.request.get(
      `https://member.bilibili.com/x/vupre/web/topic/tag/check`,
      {
        params: {
          tag: tag,
        },
        extra: {
          rawResponse: true,
        },
      }
    );
    return res.data;
  }

  /**
   * 上传
   */
  private async _upload(
    filePaths: string[] | MediaPartOptions[],
    retryOptions: {
      times?: number;
      delay?: number;
    } = {}
  ): Promise<{
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
      (filePath: any) => {
        if (isString(filePath)) {
          return {
            path: filePath,
            title: path.parse(filePath).name,
          };
        } else {
          if (!filePath.title) {
            return {
              path: filePath.path,
              title: path.parse(filePath.path).name,
            };
          } else {
            return filePath;
          }
        }
      }
    );
    const queue = new PQueue({ concurrency: 1 });
    const emitter = new EventEmitter();

    const uploadTasks: WebVideoUploader[] = [];
    for (let i = 0; i < mediaOptions.length; i++) {
      const uploader = new WebVideoUploader(mediaOptions[i], this.auth, {
        retryDelay: retryOptions.delay,
        retryTimes: retryOptions.times,
      });
      uploadTasks.push(uploader);
      queue.add(() => uploader.upload());
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
      uploader.emitter.on("error", err => {
        emitter.emit("error", err);
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
      queue.pause();
      uploadTasks.map(uploader => uploader.queue && uploader.pause());
    };
    const start = () => {
      queue.start();
      uploadTasks.map(uploader => uploader.queue && uploader.start());
    };
    const cancel = () => {
      queue.clear();
      uploadTasks.map(uploader => uploader.queue && uploader.cancel());
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
    },
    retryOptions: {
      times?: number;
      delay?: number;
    } = {}
  ) {
    this.auth.authLogin([api.submit, api.uploader]);
    if (filePaths.length === 0) throw new Error("filePaths can not be empty");
    this.checkOptions(options);

    const { emitter, queue, videos, pause, start, cancel } = await this._upload(
      filePaths,
      retryOptions
    );

    const submitApiObj = {
      client: this.addMediaClientApi.bind(this),
      web: this.addMediaWebApi.bind(this),
      "b-cut": this.addMediaBCutApi.bind(this),
    };
    const submitApi = submitApiObj[api.submit];

    queue.on("idle", async () => {
      if (videos.length !== filePaths.length) {
        // emitter.emit("error", "上传中止");
        return;
      }
      try {
        const res = await retry(
          () => submitApi(videos, options),
          retryOptions.times,
          retryOptions.delay
        );
        emitter.emit("completed", res as { aid: number; bvid: string });
      } catch (error) {
        emitter.emit("error", String(error));
        throw error;
      }
    });

    return {
      emitter,
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
  ): Promise<{ aid: number; bvid: string }> {
    return new Promise(async (resolve, reject) => {
      const { emitter } = await this.addMedia(filePaths, options, api);
      emitter.on("completed", res => {
        resolve(res);
      });
      emitter.on("error", err => {
        reject(err);
      });
    });
  }
  /**
   * 投稿视频详情，bvid和aid必须传一个
   * @param bvid 视频bvid
   * @param aid 视频aid
   */
  async getArchive(
    params:
      | {
          bvid: string;
        }
      | {
          aid: number;
        }
  ): Promise<MediaDetailReturnType> {
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
   * @param filePaths 文件路径
   * @param options
   * @param mode 编辑模式，append是追加，replace是替换
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
    },
    retryOptions: {
      times?: number;
      delay?: number;
    } = {}
  ) {
    this.auth.authLogin();
    const submitApiObj = {
      client: this.editMediaClientApi.bind(this),
      web: this.editMediaWebApi.bind(this),
    };
    const submitApi = submitApiObj[api.submit];

    const { emitter, queue, videos, pause, start, cancel } = await this._upload(
      filePaths,
      retryOptions
    );

    const submit = async () => {
      try {
        const res = await retry(
          () => submitApi(videos, { aid: aid, ...options }, mode),
          retryOptions.times,
          retryOptions.delay
        );
        emitter.emit("completed", res as { aid: number; bvid: string });
      } catch (error) {
        // console.log("error", error);
        emitter.emit("error", String(error));
        throw new Error(error);
      }
    };
    // 编辑视频时，且为append模式，运行不设置视频
    if (filePaths.length === 0) {
      await submit();
    } else {
      queue.on("idle", async () => {
        if (videos.length !== filePaths.length) {
          return;
        }
        await submit();
      });
    }

    return {
      emitter,
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
  ): Promise<{ aid: number; bvid: string }> {
    return new Promise(async (resolve, reject) => {
      const { emitter } = await this.editMedia(
        aid,
        filePaths,
        options,
        mode,
        api
      );
      emitter.on("completed", res => {
        resolve(res);
      });
      emitter.on("error", err => {
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
  ): Promise<{
    aid: number;
    bvid: string;
  }> {
    this.auth.authLogin(["client"]);
    this.checkOptions(options);
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 0,
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
      mission_id: 0,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.url;
    }

    // console.log("submit", data);

    return this.request.post(
      "http://member.bilibili.com/x/vu/client/add",
      data,
      {
        params: {
          access_key: this.auth.accessToken,
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
  ): Promise<{
    aid: number;
    bvid: string;
  }> {
    this.auth.authLogin();
    this.checkOptions(options);
    const csrf = this.auth.cookieObj.bili_jct;
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 0,
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
      mission_id: 0,
      csrf: csrf,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.url;
    }

    // console.log("submit", data);

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
  ): Promise<{
    aid: number;
    bvid: string;
  }> {
    this.auth.authLogin();
    this.checkOptions(options);
    const csrf = this.auth.cookieObj.bili_jct;
    const data = {
      copyright: 1,
      tid: 124,
      desc_format_id: 0,
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
      mission_id: 0,
      csrf: csrf,
      ...options,
    };

    if (options.cover && !options.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(options.cover);
      data["cover"] = coverRes.url;
    }

    // console.log("submit", data);

    return this.request.post("https://member.bilibili.com/x/vu/web/add", data, {
      params: {
        t: Date.now(),
        csrf: csrf,
      },
    });
  }

  convertDescV2ToDesc(descV2: DescV2[]): string {
    return descV2
      .map(item => {
        if (item.type === 1) {
          return item.raw_text;
        } else if (item.type === 2) {
          return `@${item.raw_text} `;
        } else {
          throw new Error(`不存在该type:${item.type}`);
        }
      })
      .join("");
  }

  /**
   * 通过web api接口编辑视频
   */
  async editMediaWebApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: Partial<MediaOptions> & { aid: number },
    mode: "append" | "replace"
  ): Promise<{
    aid: number;
    bvid: string;
  }> {
    this.auth.authLogin();
    const archive = await this.getArchive({
      aid: options.aid,
    });
    const archiveData = archive.archive;
    for (const key of [
      "recreate",
      "human_type2",
      "activity",
      "attrs",
      "tp_info",
    ]) {
      delete archiveData[key];
    }

    const csrf = this.auth.cookieObj.bili_jct;
    const data: MediaOptions & {
      csrf: string;
      videos: { cid: number; filename: string; title: string; desc?: string }[];
      aid: number;
    } = {
      videos: [],
      ...archiveData,
      csrf: csrf,
      ...options,
    };
    this.checkOptions(data);

    data.aid = Number(data.aid);
    if (data.cover && !data.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(data.cover);
      data["cover"] = coverRes.url;
    }
    if (data.desc_v2) {
      data.desc = this.convertDescV2ToDesc(data.desc_v2);
    }
    if (mode === "append") {
      data.videos = [...archive.videos, ...videos];
    } else if (mode === "replace") {
      data.videos = videos;
    } else {
      throw new Error("mode can only be append or replace");
    }

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
   * 通过client api接口编辑视频
   */
  async editMediaClientApi(
    videos: { cid: number; filename: string; title: string; desc?: string }[],
    options: Partial<MediaOptions> & { aid: number },
    mode: "append" | "replace"
  ): Promise<{
    aid: number;
    bvid: string;
  }> {
    this.auth.authLogin(["client"]);
    const archive = await this.getArchive({
      aid: options.aid,
    });
    const archiveData = archive.archive;
    for (const key of [
      "recreate",
      "human_type2",
      "activity",
      "attrs",
      "tp_info",
    ]) {
      delete archiveData[key];
    }

    const data: MediaOptions & {
      videos: { cid: number; filename: string; title: string; desc?: string }[];
      aid: number;
    } = {
      videos: [],
      ...archiveData,
      ...options,
    };
    this.checkOptions(data);

    data.aid = Number(data.aid);

    if (data.cover && !data.cover.startsWith("http")) {
      const coverRes = await this.uploadCover(data.cover);
      data["cover"] = coverRes.url;
    }
    if (data.desc_v2) {
      data.desc = this.convertDescV2ToDesc(data.desc_v2);
    }
    if (mode === "append") {
      data.videos = [...archive.videos, ...videos];
    } else if (mode === "replace") {
      data.videos = videos;
      if (data.videos.length === 0) {
        throw new Error("videos can not be empty");
      }
    } else {
      throw new Error("mode can only be append or replace");
    }
    return this.request.post(
      "http://member.bilibili.com/x/vu/client/edit",
      data,
      {
        params: {
          access_key: this.auth.accessToken,
        },
      }
    );
  }

  /**
   * 上传封面
   * @param filePath 文件路径
   */
  async uploadCover(filePath: string): Promise<{ url: string }> {
    this.auth.authLogin();

    return this.request.post(
      "https://member.bilibili.com/x/vu/web/cover/up",
      {
        cover: await readFileAsBase64(filePath),
        csrf: this.auth.cookieObj.bili_jct,
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
  async getUploadTemplateList(): Promise<{
    tid: number;
    name: string;
    typeid: number;
    title: string;
    tags: string;
    description: string;
    copyright: 1 | 2;
    attribute: 0 | number;
    is_default: 0 | 1;
  }> {
    this.auth.authLogin();
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
  ): Promise<{}> {
    this.auth.authLogin();
    return this.request.post(
      "https://member.bilibili.com/x/vupre/web/tpl/update",
      {
        tid: tid,
        ...options,
        csrf: this.auth.cookieObj.bili_jct,
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
    {
      tag: string;
      checked: number;
      request_id: string;
    }[]
  > {
    this.auth.authLogin();
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
      /** 每页个数 */
      ps: number;
      /** 视频标题 */
      title?: string;
    } = {
      pn: 0,
      ps: 20,
    }
  ): Promise<{
    topics: {
      topic_id: number;
      topic_name: string;
      description: string;
      mission_id: number;
      activity_text: string;
      activity_description: string;
    }[];
    tags: null;
    maxpage: number;
    request_id: string;
  }> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/topic/type",
      {
        params: params,
      }
    );
  }
  /**
   * 话题搜索
   */
  async searchTopic(
    params: {
      /** 每页个数 */
      page_size?: number;
      /** 个数偏移，并非页数 */
      offset?: number;
      /** 关键字 */
      keywords?: string;
      /** 当前时间 */
      t?: number;
    } = {
      page_size: 20,
      offset: 0,
    }
  ): Promise<{
    result: {
      has_create_jurisdiction: boolean;
      is_new_topic: boolean;
      tips: string;
      page_info: {
        has_more: boolean;
        offset: number;
        page_number: number;
      };
      topics: {
        act_protocol: string;
        activity_sign: string;
        description: string;
        id: number;
        mission_id: number;
        name: string;
        state: number;
        uname: string;
      }[];
    }[];
  }> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/topic/search",
      {
        params: params,
      }
    );
  }
  /**
   * 合集列表
   */
  async getSeasonList(
    params: {
      /** 页码，从1开始 */
      pn: number;
      /** 个数 */
      ps: number;
      /** 排序字段,ctime：创建时间，mtime：修改时间 */
      order?: "ctime" | "mtime";
      sort?: "desc" | "asc";
    } = {
      pn: 1,
      ps: 30,
    }
  ): Promise<getSeasonListReturnType> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x2/creative/web/seasons",
      {
        params: params,
      }
    );
  }
  /**
   * 合集内添加内容
   */
  async addMedia2Season(params: {
    /** 合集下的section_id */
    sectionId: number;
    /** aid: 视频id, cid:分p id */
    episodes: { aid: number; cid: number; title: string }[];
  }): Promise<{}> {
    this.auth.authLogin();
    return this.request.post(
      "https://member.bilibili.com/x2/creative/web/season/section/episodes/add",
      {
        ...params,
        csrf: this.auth.cookieObj.bili_jct,
      },
      {
        params: {
          t: Date.now(),
          csrf: this.auth.cookieObj.bili_jct,
        },
      }
    );
  }

  /**
   * 编辑投稿视频合集
   */
  async editMediaSeason(params: {
    /** 视频id */
    aid: number;
    /** 合集id,null就是从合集中移除 */
    season_id: number | null;
    /** 合集下section_id,null就是从合集中移除 */
    section_id: number | null;
    /** 视频标题 */
    title: string;
  }): Promise<{
    season_id?: number | null;
    section_id?: number | null;
    title: string;
    aid: number;
    csrf: string;
  }> {
    this.auth.authLogin();
    return this.request.post(
      "https://member.bilibili.com/x2/creative/web/season/switch",
      {
        ...params,
        csrf: this.auth.cookieObj.bili_jct,
      },
      {
        params: {
          t: Date.now(),
          csrf: this.auth.cookieObj.bili_jct,
        },
      }
    );
  }

  /**
   * aid反查合集id
   */
  async getSessionId(aid: number): Promise<Season> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x2/creative/web/season/aid",
      {
        params: {
          id: aid,
        },
      }
    );
  }

  /**
   * 获取合集详情
   * @param id 合集id
   */
  async getSeasonDetail(id: number): Promise<{
    checkin: null;
    course: null;
    part_episodes: null;
    season: Season;
    seasonStat: null;
    sections: {
      sections: Section[];
      total: number;
    };
  }> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x2/creative/web/season",
      {
        params: {
          id: id,
        },
      }
    );
  }
  /**
   * 获取合集小节详情
   * @param id 小节id
   */
  async getSectionDetail(id: number): Promise<{
    section: Section;
  }> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x2/creative/web/season/section",
      {
        params: {
          id: id,
        },
      }
    );
  }
  /**
   * 获取投稿的相关活动及分区信息
   */
  async getArchivePre(): Promise<ArchivePreReturnType> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/archive/pre"
    );
  }
  /**
   * 获取分区的简介相关信息
   * @param typeid 分区id
   * @param copyright 版权类型，可选 1，2
   * @returns typeid: 分区id, id: 未知, lang: 未知, copyright：版权类型
   * components: 简介输入框提示文字，一个json字符串，例：'[{"name":"相关游戏","index":1,"type":"text","required":"1","box":"请输入本视频所涉及的游戏名称，以顿号分隔，例：英雄联盟、塞尔达传说、刺客信条"},{"name":"简介补充","index":2,"type":"textarea","required":"1","box":""}]'
   */
  getTypeDesc(
    typeid: number,
    copyright: 1 | 2 = 1
  ): Promise<null | {
    typeid: number;
    id: number;
    lang: 0;
    copyright: 1 | 2;
    components: string;
  }> {
    this.auth.authLogin();
    return this.request.get(
      "https://member.bilibili.com/x/vupre/web/archive/desc/format",
      {
        params: {
          typeid: typeid,
          copyright: copyright,
          t: Date.now(),
        },
      }
    );
  }
}
