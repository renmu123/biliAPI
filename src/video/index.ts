import EventEmitter from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TypedEmitter } from "tiny-typed-emitter";

import Reply from "./reply.js";
import { BaseRequest } from "../base/index.js";
import Auth from "../base/Auth.js";
import Downloader from "../utils/downloader.js";
import { mergeMedia } from "../utils/ffmpeg.js";
import { uuid } from "../utils/index.js";

import type { GenerateNumberRange } from "../types/utils.js";
import type { VideoId } from "../types/index.js";
import type {
  VideoDetailReturnType,
  PlayUrlReturnType,
  VideoQn,
  VideoCodec,
} from "../types/video.js";

interface ProgressEvent {
  event: "download" | "merge-start" | "merge-end";
  progress?: {
    loaded: number;
    total: number;
    progress: number;
  };
}

interface EmitterEvents {
  "download-completed": (response: string[]) => void;
  progress: (response: ProgressEvent) => void;
  error: (response: string) => void;
  completed: (response: string) => void;
}

export default class Video extends BaseRequest {
  aid?: number;
  noAuthUseCookie: boolean;
  constructor(
    auth: Auth = new Auth(),
    noAuthUseCookie: boolean = true,
    aid?: number
  ) {
    super(auth);

    this.aid = aid;
    this.noAuthUseCookie = noAuthUseCookie;
  }
  /**
   * 设置视频aid
   * @param aid 视频aid
   */
  setAid(aid: number) {
    this.aid = aid;
  }
  /**
   * 获取视频信息
   */
  info(params: VideoId): Promise<{
    [key: string]: any;
  }> {
    const url = `https://api.bilibili.com/x/web-interface/view`;
    return this.request.get(url, {
      params: params,
    });
  }
  /**
   * 获取视频详细信息
   */
  detail(params: VideoId): Promise<VideoDetailReturnType> {
    const url = `https://api.bilibili.com/x/web-interface/view/detail`;
    return this.request.get(url, {
      params: params,
    });
  }
  /**
   * 获取视频简介
   */
  desc(params: VideoId): Promise<{
    code: number;
    message: string;
    ttl: number;
    data: string;
  }> {
    const url = `https://api.bilibili.com/x/web-interface/archive/desc`;
    return this.request.get(url, {
      params: params,
    });
  }
  /**
   *查询视频分P列表 (aid/bvid转cid)
   */
  pagelist(params: VideoId): Promise<{
    cid: number;
    page: number;
    from: string;
    part: string;
    duration: number;
    vid: string;
    weblink: string;
    dimension: {
      width: number;
      height: number;
      rotate: number;
    };
    first_frame: string;
  }> {
    const url = `https://api.bilibili.com/x/player/pagelist`;
    return this.request.get(url, {
      params: params,
    });
  }
  /**
   * 点赞
   * @param aid 视频aid
   * @param like 点赞或取消点赞
   */
  async like(params: { aid?: number; like: boolean }): Promise<{}> {
    this.auth.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/archive/like`;
    const data = {
      aid: params.aid ?? this.aid,
      like: params.like ? "1" : "2",
      csrf: this.auth.cookieObj.bili_jct,
    };
    return this.request.post(url, data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  /**
   * 投币
   * @param aid 视频aid
   * @param multiply 1: 1枚，2：2枚
   */
  async coin(params: { aid?: number; multiply: "1" | "2" }): Promise<{}> {
    this.auth.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/coin/add`;
    const data = {
      aid: this.aid,
      ...params,
      csrf: this.auth.cookieObj.bili_jct,
    };
    return this.request.post(url, data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  /**
   * 列出收藏夹
   * @param aid aid
   * @param type 收藏夹类型，默认2
   */
  async listFavoriteBox(params?: { aid?: number; type: number }): Promise<{
    count: number;
    list: {
      id: number;
      fid: number;
      mid: number;
      attr: number;
      title: string;
      fav_state: number;
      media_count: number;
    }[];
    season: any;
  }> {
    this.auth.authLogin();
    const data = {
      rid: params.aid ?? this.aid,
      up_mid: this.auth.uid,
      ...params,
      csrf: this.auth.cookieObj.bili_jct,
    };
    const url = `https://api.bilibili.com/x/v3/fav/folder/created/list-all`;
    return this.request.get(url, {
      params: data,
    });
  }
  /**
   * 处理收藏夹内容
   * @param aid aid
   * @param type 收藏夹类型，默认2
   * @param add_media_ids 添加的视频id，英文逗号分隔
   * @param del_media_ids 删除的视频id，英文逗号分隔
   */
  async editFavoriteBox(params: {
    aid?: number;
    type: number;
    add_media_ids?: string;
    del_media_ids?: string;
  }): Promise<{
    prompt: boolean;
    ga_data: any;
    total_msg: string;
    success_num: number;
  }> {
    this.auth.authLogin();
    const url = `https://api.bilibili.com/x/v3/fav/resource/deal`;
    const data = {
      rid: params.aid ?? this.aid,
      up_mid: this.auth.uid,
      ...params,
      csrf: this.auth.cookieObj.bili_jct,
    };
    return this.request.post(url, data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  /**
   * 增加分享次数
   * @param aid 视频aid
   */
  async addShare(params?: { aid?: number }): Promise<{}> {
    this.auth.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/share/add`;
    const data = {
      aid: params.aid ?? this.aid,
      csrf: this.auth.cookieObj.bili_jct,
    };
    return this.request.post(url, data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  /**
   * 一键三连
   * @param aid 视频aid
   */
  async likeCoinShare(params?: { aid?: number }): Promise<{
    like: boolean;
    coin: boolean;
    fav: boolean;
    multiply: number;
    id_risk: boolean;
    gaia_res_type: number;
    gaia_data: any;
  }> {
    this.auth.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/archive/like/triple`;
    const data = {
      aid: params.aid ?? this.aid,
      csrf: this.auth.cookieObj.bili_jct,
    };
    return this.request.post(url, data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  /**
   * 获取视频信息
   * 限制游客访问的视频需要登录
   * @param aid 视频aid
   * @param bvid 视频bvid
   */
  async getInfo(params: VideoId): Promise<{
    [key: string]: any;
  }> {
    const url = `https://api.bilibili.com/x/web-interface/view`;
    const data = {
      aid: params.aid ?? this.aid,
    };
    return this.request.get(url, {
      params: data,
    });
  }
  /**
   * 获取视频信息
   */
  async playurl(params: {
    aid?: number;
    bvid?: string;
    cid: number;
    qn?: number;
    fnval?: number;
    fourk?: 0 | 1;
    platform?: "pc" | "html5";
    high_quality?: 0 | 1;
  }): Promise<PlayUrlReturnType> {
    const url = `https://api.bilibili.com/x/player/wbi/playurl`;
    const data = {
      fnver: 0,
      ...params,
    };
    const signParams = await this.WbiSign(data);
    return this.request.get(`${url}?${signParams}`);
  }
  /**
   * 获取视频弹幕，为protobuf格式
   * @param cid 视频cid
   * @param aid 视频aid
   * @param segment_index 弹幕分片序号，6min一包，从0开始
   * @param pull_mode 未知
   * @param ps 未知
   * @param pn 未知
   */
  async getDm(params: {
    cid: number;
    aid?: number;
    segment_index: number;
    pull_mode?: number;
    ps?: number;
    pn?: number;
  }): Promise<Buffer> {
    const url = `https://api.bilibili.com/x/v2/dm/wbi/web/seg.so`;
    const options = {
      type: 1,
      oid: params.cid,
      ...params,
    };
    if (!options.type) options.type = 1;

    const signParams = await this.WbiSign(options);
    const res = await this.request.get(`${url}?${signParams}`, {
      responseType: "arraybuffer",
      extra: {
        rawResponse: true,
      },
    });
    return res.data;
  }

  /**
   * 获取视频所有弹幕，是否登录影响弹幕数量
   * @param cid 视频cid
   * @param aid 视频aid
   */
  async getAllDm(params: {
    cid: number;
    aid?: number;
    bvid?: string;
  }): Promise<Buffer> {
    // bvid和aid二选一
    if (!params.aid && !params.bvid) {
      throw new Error("aid or bvid is required");
    }
    const detail = await this.detail({
      aid: params.aid,
      bvid: params.bvid,
    });
    const duration = detail.View?.duration;
    if (!duration) throw new Error("视频时长获取失败");

    const totalSegment = Math.ceil(duration / 360);
    const dmList: Buffer[] = [];
    // 从1开始
    for (let i = 0; i < totalSegment; i++) {
      const res = await this.getDm({
        cid: params.cid,
        aid: params.aid,
        segment_index: i + 1,
      });
      dmList.push(res);
    }
    // @ts-ignore
    return Buffer.concat(dmList);
  }

  private authAid() {
    if (!this.aid) {
      throw new Error("aid is should be set");
    }
  }

  /**
   * 下载视频，如果不传递cid，会对视频详情接口进行一次请求。
   * @param options
   * @param options.aid 视频aid, 与bvid二选一
   * @param options.bvid 视频bvid，与aid二选一
   * @param options.cid 视频cid，与part二选一
   * @param options.part 视频分p，从0开始计算，如果有cid，则优先cid，如果二者皆为空，下载第一个
   * @param options.output 输出文件路径
   * @param options.ffmpegBinPath ffmpeg路径，用于合并视频和音频
   * 如果不传递默认使用web模式，最高720p分辨率，且mediaOptions参数除qn不会生效
   * 如果传递，则使用dash模式，分辨率和账户相关，如果想使用环境变量中的可以传递ffmpeg
   * @param options.cachePath 缓存路径，默认使用系统临时目录
   *
   * @param mediaOptions
   * @param mediaOptions.resolution 分辨率宽度，默认为可选最高 @link https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#fnval%E8%A7%86%E9%A2%91%E6%B5%81%E6%A0%BC%E5%BC%8F%E6%A0%87%E8%AF%86
   * @param mediaOptions.videoCodec 视频编码，默认为符合视频质量的第一个编码，7：H264，12：H265，13：AV1
   * @param mediaOptions.audioQuality 音质，默认使用最高音质，30216：64k，30232：128k，30280：192k，30250：杜比全景声，30251：Hi-Res无损
   * @param mediaOptions.qn 视频质量，默认使用64，会下载支持的最高质量，6: 240p, 16: 260p, 32: 480p,64：720p，80：1080p，112：1080p60，116：4k
   */
  async download(
    options: {
      cid?: number;
      part?: number;
      output: string;
      ffmpegBinPath?: string;
      cachePath?: string;
    } & VideoId,
    mediaOptions: {
      videoCodec?: VideoCodec;
      audioQuality?: 30216 | 30232 | 30280 | 30250 | 30251;
      qn?: VideoQn;
    } = {},
    autoStart: boolean = true
  ) {
    if (!options.cid) {
      const data = await this.detail({
        aid: options.aid,
        bvid: options.bvid,
      });
      options.bvid = data.View.bvid;
      const pages = data.View?.pages || [];
      let page = pages[options.part || 0];
      if (!page) throw new Error("不存在符合要求的视频");

      options.cid = page.cid;
    }

    if (options.ffmpegBinPath) {
      const _options = options as {
        cid: number;
        output: string;
        ffmpegBinPath: string;
        cachePath?: string;
      } & VideoId;
      return this.dashDownload(_options, mediaOptions, autoStart);
    } else {
      const _options = options as {
        cid: number;
        output: string;
        cachePath?: string;
      } & VideoId;
      return this.mp4Download(_options, mediaOptions, autoStart);
    }
  }

  /**
   * dash下载视频
   * @param options
   * @param options.aid 视频aid, 与bvid二选一
   * @param options.bvid 视频bvid，与aid二选一
   * @param options.cid 视频cid
   * @param options.output 输出文件路径
   * @param options.ffmpegBinPath ffmpeg路径，用于合并视频和音频
   * @param options.cachePath 缓存路径，默认使用系统临时目录
   * @param options.disableVideo 禁止下载视频
   * @param options.disableAudio 禁止下载音频
   * @param mediaOptions
   * @param mediaOptions.qn 画质参数，默认为可选最高 @link https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#fnval%E8%A7%86%E9%A2%91%E6%B5%81%E6%A0%BC%E5%BC%8F%E6%A0%87%E8%AF%86
   * @param mediaOptions.videoCodec 视频编码，默认为符合视频质量的第一个编码，7：H264，12：H265，13：AV1
   * @param mediaOptions.audioQuality 音质，默认使用最高音质，30216：64k，30232：128k，30280：192k，30250：杜比全景声，30251：Hi-Res无损
   */
  async dashDownload(
    options: {
      cid: number;
      output: string;
      ffmpegBinPath: string;
      cachePath?: string;
      disableVideo?: boolean;
      disableAudio?: boolean;
    } & VideoId,
    mediaOptions: {
      videoCodec?: VideoCodec;
      audioQuality?: 30216 | 30232 | 30280 | 30250 | 30251;
      qn?: VideoQn;
    } = {},
    autoStart: boolean = true
  ) {
    const emitter = new EventEmitter() as TypedEmitter<EmitterEvents>;

    if (options.disableVideo && options.disableAudio) {
      throw new Error("不能同时禁止视频和音频");
    }

    const media = await this.playurl({
      bvid: options.bvid,
      aid: options.aid,
      cid: options.cid,
      fnval: 16 | 4048,
    });

    let videos = (media.dash.video || []).filter(video => {
      if (!mediaOptions.videoCodec) return true;
      return video.codecid === mediaOptions.videoCodec;
    });
    if (mediaOptions.qn) {
      videos = videos.filter(video => video.id === mediaOptions.qn);
    }

    let audios = media.dash.audio || [];
    // TODO: 这样处理会导致只有杜比音频，那么一定会使用杜比，可能不是用户想要的
    if (media.dash?.dolby?.audio) {
      // 如果有杜比音频，杜比音频也要被添加
      audios.unshift(...media.dash.dolby.audio);
    }

    audios = media.dash.audio.filter(audio => {
      if (!mediaOptions.audioQuality) return true;
      return audio.id === mediaOptions.audioQuality;
    });

    if (audios.length === 0) {
      throw new Error("不存在符合要求的音频");
    }
    if (videos.length === 0) {
      throw new Error("不存在符合要求的视频");
    }

    const video = videos[0];
    const audio = audios[0];

    const downloadedFile: string[] = [];
    const cachePath =
      options.disableVideo || options.disableAudio
        ? null
        : options.cachePath ?? os.tmpdir();

    // let loadedSize = 0;
    let audioDownloader: Downloader | null,
      videoDownloader: Downloader | null = null;

    if (!options.disableVideo) {
      const output = cachePath
        ? path.join(cachePath, `${uuid()}.mp4`)
        : options.output;

      videoDownloader = new Downloader({
        url: video.baseUrl,
        filePath: output,
        axiosRequestConfig: {
          headers: {
            Referer: "https://www.bilibili.com/",
            cookie: this.auth.cookie,
          },
        },
        oncompleted: downloader => {
          downloadedFile.push(downloader.filePath);
          emitter.emit("download-completed", downloadedFile);
        },
        onprogress: progress => {
          const loaded =
            videoDownloader.downloadedSize +
            (audioDownloader?.downloadedSize || 0);
          const total =
            videoDownloader.totalSize + (audioDownloader?.totalSize || 0);
          const data: ProgressEvent = {
            event: "download",
            progress: {
              loaded: loaded,
              total: total,
              progress: loaded / total,
            },
          };
          emitter.emit("progress", data);
        },
        onerror: error => {
          emitter.emit("error", error.message);
          console.error(error);
        },
      });
    }
    if (!options.disableAudio) {
      const output = cachePath
        ? path.join(cachePath, `${uuid()}.mp3`)
        : options.output;
      audioDownloader = new Downloader({
        url: audio.baseUrl,
        filePath: output,
        axiosRequestConfig: {
          headers: {
            Referer: "https://www.bilibili.com/",
            cookie: this.auth.cookie,
          },
        },
        oncompleted: downloader => {
          downloadedFile.push(downloader.filePath);
          emitter.emit("download-completed", downloadedFile);
        },
        onprogress: progress => {
          const loaded =
            (videoDownloader?.downloadedSize || 0) +
            audioDownloader.downloadedSize;
          const total =
            (videoDownloader?.totalSize || 0) + audioDownloader.totalSize;
          const data: ProgressEvent = {
            event: "download",
            progress: {
              loaded: loaded,
              total: total,
              progress: total ? loaded / total : 0,
            },
          };
          emitter.emit("progress", data);
        },
        onerror: error => {
          emitter.emit("error", error.message);
        },
      });
    }

    const clean = () => {
      try {
        fs.promises.unlink(videoDownloader.filePath);
        fs.promises.unlink(audioDownloader.filePath);
      } catch (error) {
        console.warn(error);
      }
    };

    emitter.on("download-completed", async files => {
      if (files.length === 2) {
        const ffmpegBinPath = options.ffmpegBinPath ?? "ffmpeg";
        emitter.emit("progress", { event: "merge-start" });
        try {
          await mergeMedia(files, options.output, [], ffmpegBinPath);
          emitter.emit("progress", { event: "merge-end" });
          clean();
          emitter.emit("completed", options.output);
        } catch (error) {
          emitter.emit("error", error);
        }
      }
      if (
        files.length === 1 &&
        (options.disableVideo || options.disableAudio)
      ) {
        emitter.emit("completed", files[0]);
      }
    });
    emitter.on("error", () => {
      clean();
    });

    if (autoStart) {
      if (!options.disableVideo) videoDownloader.start();
      if (!options.disableAudio) audioDownloader.start();
    }

    const task = {
      pause: () => {
        if (!options.disableVideo) videoDownloader.pause();
        if (!options.disableAudio) audioDownloader.pause();
      },
      start: () => {
        if (!options.disableVideo) videoDownloader.start();
        if (!options.disableAudio) audioDownloader.start();
      },
      cancel: () => {
        if (!options.disableVideo) videoDownloader.cancel();
        if (!options.disableAudio) audioDownloader.cancel();
        clean();
      },
      on(
        event: "progress" | "completed" | "error",
        callback: (res: any) => void
      ) {
        this.emitter.on(event, callback);
      },
      emitter,
    };
    return task;
  }

  /**
   * mp4下载视频，无需ffmpeg进行合并
   * @param options
   * @param options.aid 视频aid, 与bvid二选一
   * @param options.bvid 视频bvid，与aid二选一
   * @param options.cid 视频cid
   * @param options.output 输出文件路径
   *
   * @param mediaOptions
   * @param mediaOptions.qn 视频质量，默认使用64，6: 240p, 16: 260p, 32: 480p,64：720p，80：1080p，112：1080p60，116：4k
   */
  async mp4Download(
    options: {
      cid: number;
      output: string;
    } & VideoId,
    mediaOptions: {
      qn?: VideoQn;
    } = {
      qn: 64,
    },
    autoStart: boolean = true
  ) {
    const emitter = new EventEmitter() as TypedEmitter<EmitterEvents>;

    const media = await this.playurl({
      bvid: options.bvid,
      aid: options.aid,
      cid: options.cid,
      fnval: 1,
      platform: "html5",
      high_quality: 1,
      qn: mediaOptions.qn || 64,
    });
    let videoUrl = media.durl[0]?.url;
    if (!videoUrl) {
      throw new Error("没有可下载链接");
    }

    const videoDownloader = new Downloader({
      url: videoUrl,
      filePath: options.output,
      axiosRequestConfig: {
        headers: {
          Referer: "https://www.bilibili.com/",
          cookie: this.auth.cookie,
        },
      },
      oncompleted: downloader => {
        emitter.emit("completed", downloader.filePath);
      },
      onprogress: p => {
        emitter.emit("progress", {
          event: "download",
          progress: p,
        });
      },
      onerror: error => {
        emitter.emit("error", error.message);
        console.error(error);
      },
    });

    const clean = () => {
      try {
        fs.promises.unlink(videoDownloader.filePath);
      } catch (error) {
        console.warn(error);
      }
    };

    emitter.on("error", () => {
      clean();
    });

    if (autoStart) videoDownloader.start();

    const task = {
      pause: () => {
        videoDownloader.pause();
      },
      start: () => {
        videoDownloader.start();
      },
      cancel: () => {
        videoDownloader.cancel();
        clean();
      },
      on(
        event: "progress" | "completed" | "error",
        callback: (res: any) => void
      ) {
        this.emitter.on(event, callback);
      },
      emitter,
    };
    return task;
  }

  /**
   * 创建评论对象，操作评论的方法需要传递rpid
   * @param rpid 回复的评论id
   */
  createReply(rpid?: number) {
    const replyParams: {
      oid: number;
      type: number;
      plat: 1;
      rpid: number;
    } = {
      oid: this.aid,
      type: 1,
      plat: 1,
      rpid: rpid,
    };
    const _reply = new Reply(this.auth, false, this.aid);

    return {
      /**
       * 设置oid
       * @param oid 视频aid
       */
      setOid: (oid: number) => {
        replyParams.oid = oid;
      },
      /**
       * 评论列表
       * @param ps 每页数量，默认20
       * @param pn 页码，默认1
       * @param sort 排序方式, 0: 按时间, 1: 按点赞, 2: 按回复
       * @param nohot 是否显示热门评论, 0: 不显示, 1: 显示
       */
      list: (params?: {
        ps?: GenerateNumberRange<1, 20>;
        pn?: number;
        sort?: 0 | 1 | 2;
        nohot?: 0 | 1;
      }) => {
        return _reply.list({ ...replyParams, ...params });
      },
      /**
       * 评论个数
       */
      count: () => {
        return _reply.count({ ...replyParams });
      },
      /**
       * 添加评论
       * @param root 根评论id
       * @param parent 父评论id
       * @param message 评论内容
       * @param at_name_to_mid 用户信息
       * @param pictures 图片地址
       */
      add: (params: {
        root?: number;
        parent?: number;
        message: string;
        at_name_to_mid?: string;
        pictures?: string;
      }) => {
        this.authAid();
        return _reply.add({ ...replyParams, ...params });
      },
      /**
       * 评论点赞
       * @param rpid 评论id
       * @param action 1: 点赞, 0: 取消点赞
       */
      like: (params: { rpid?: number; action: 1 | 0 }) => {
        this.authAid();
        return _reply.like({ ...replyParams, ...params });
      },
      /**
       * 评论点踩
       * @param rpid 评论id
       * @param action 1: 点踩, 0: 取消点踩
       */
      hate: (params: { rpid?: number; action: 1 | 0 }) => {
        this.authAid();
        return _reply.hate({ ...replyParams, ...params });
      },
      /**
       * 评论删除
       * @param rpid 评论id
       * @param action 1: 点踩, 0: 取消点踩
       */
      delete: (params?: { rpid?: number }) => {
        this.authAid();
        return _reply.delete({
          ...replyParams,
          ...params,
        });
      },
      /**
       * 举报评论
       * @param rpid 评论id
       * @param action 1: 点踩, 0: 取消点踩
       */
      report: (params: { rpid?: number; reason: number }) => {
        this.authAid();
        return _reply.report({
          ...replyParams,
          ...params,
        });
      },
      /**
       * 置顶评论
       * @param rpid 评论id
       * @param action 1: 点踩, 0: 取消点踩
       */
      top: (params: { rpid?: number; action: 1 | 0 }) => {
        this.authAid();
        return _reply.top({ ...replyParams, ...params });
      },
    };
  }
}
