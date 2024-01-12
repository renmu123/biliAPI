import EventEmitter from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Reply from "./reply";
import { BaseRequest } from "../base/index";
import Auth from "../base/Auth";
import Downloader from "../utils/downloader";
import { mergeMedia } from "../utils/ffmpeg";
import { uuid } from "../utils/index";

import type { GenerateNumberRange } from "../types/utils";
import type { VideoDetailReturnType, PlayUrlReturnType } from "../types/video";

export default class Video extends BaseRequest {
  aid?: number;
  noAuthUseCookie: boolean;
  constructor(
    auth: Auth = new Auth(),
    noAuthUseCookie: boolean = false,
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
  info(params: { aid?: number; bvid?: string }): Promise<{
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
  detail(params: {
    aid?: number;
    bvid?: string;
  }): Promise<VideoDetailReturnType> {
    const url = `https://api.bilibili.com/x/web-interface/view/detail`;
    return this.request.get(url, {
      params: params,
    });
  }
  /**
   * 获取视频简介
   */
  desc(params: { aid?: number; bvid?: string }): Promise<{
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
  pagelist(params: { aid?: number; bvid?: string }): Promise<{
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
    return this.request.post(url, {
      data,
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
    return this.request.post(url, {
      data,
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
    return this.request.post(url, {
      data: data,
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
    return this.request.post(url, {
      data,
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
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 获取视频信息
   * 限制游客访问的视频需要登录
   * @param aid 视频aid
   * @param bvid 视频bvid
   */
  async getInfo(params: { aid?: number; bvid?: string }): Promise<{
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
    bvid?: string;
    cid: number;
    qn?: number;
    fnval?: number;
    fourk?: 0 | 1;
    platform?: "pc" | "html5";
  }): Promise<PlayUrlReturnType> {
    const url = `https://api.bilibili.com/x/player/wbi/playurl`;
    const data = {
      fnver: 0,
      ...params,
    };
    const signParams = await this.WbiSign(data);
    return this.request.get(`${url}?${signParams}`);
  }
  private authAid() {
    if (!this.aid) {
      throw new Error("aid is should be set");
    }
  }

  /**
   * 下载视频
   * @param options
   * @param options.aid 视频aid, 与bvid二选一
   * @param options.bvid 视频bvid，与aid二选一
   * @param options.cid 视频cid，与part二选一
   * @param options.part 视频分p，从0开始计算，如果有cid，则优先cid，如果二者皆为空，下载第一个
   * @param options.output 输出文件路径
   * @param options.ffmpegBinPath ffmpeg路径，用于合并视频和音频，默认使用环境变量中的ffmpeg
   * @param options.cachePath 缓存路径，默认使用系统临时目录
   *
   * @param mediaOptions
   * @param mediaOptions.quality 视频质量，默认为最高质量 @link https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#fnval%E8%A7%86%E9%A2%91%E6%B5%81%E6%A0%BC%E5%BC%8F%E6%A0%87%E8%AF%86
   * @param mediaOptions.videoCodec 视频编码，默认为符合视频质量的第一个编码，7：H264，12：H265，13：AV1
   * @param mediaOptions.audioQuality 音质，默认使用最高音质，30216：64k，30232：128k，30280：192k，30250：杜比全景声，30251：Hi-Res无损
   */
  async download(
    options: {
      aid?: number;
      bvid?: string;
      cid?: number;
      part?: number;
      output: string;
      ffmpegBinPath?: string;
      cachePath?: string;
    },
    mediaOptions: {
      videoCodec?: 7 | 12 | 13;
      audioQuality?: 30216 | 30232 | 30280 | 30250 | 30251;
      quality?: number;
    } = {}
  ) {
    const emitter = new EventEmitter();

    const data = await this.detail({
      aid: options.aid,
      bvid: options.bvid,
    });
    const bvid = data.View.bvid;
    const pages = data.View?.pages || [];
    let page = pages[options.part || 0];
    if (options.cid) {
      page = pages.find((item: any) => item.cid === options.cid);
    }
    if (!page) throw new Error("不存在符合要求的视频");

    const cid = page.cid;
    const media = await this.playurl({
      bvid: bvid,
      cid: cid,
      fnval: 16 | 2048,
    });
    const videos = (media.dash.video || []).filter(video => {
      if (!mediaOptions.videoCodec) return true;
      return video.codecid === mediaOptions.videoCodec;
    });
    const audios = media.dash.audio.filter(audio => {
      if (!mediaOptions.audioQuality) return true;
      return audio.id === mediaOptions.audioQuality;
    });

    if (videos.length === 0) throw new Error("不存在符合要求的视频");
    if (audios.length === 0) throw new Error("不存在符合要求的音频");

    const video = videos[0];
    const audio = audios[0];

    const downloadedFile: string[] = [];
    const cachePath = options.cachePath ?? os.tmpdir();

    const videoDownloader = new Downloader({
      url: video.baseUrl,
      filePath: path.join(cachePath, `${uuid()}.mp4`),
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
        emitter.emit("progress", { event: "download", progress });
      },
      onerror: error => {
        emitter.emit("error", { error: String(error) });
        console.error(error);
      },
    });
    const audioDownloader = new Downloader({
      url: audio.baseUrl,
      filePath: path.join(cachePath, `${uuid()}.mp3`),
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
        emitter.emit("progress", { event: "download", progress });
      },
      onerror: error => {
        emitter.emit("error", { error: String(error) });
        console.error(error);
      },
    });

    const clean = () => {
      try {
        fs.promises.unlink(videoDownloader.filePath);
        fs.promises.unlink(audioDownloader.filePath);
      } catch (error) {
        console.warn(error);
      }
    };

    emitter.on("download-completed", async files => {
      const ffmpegBinPath = options.ffmpegBinPath ?? "ffmpeg";
      console.log("download-completed", files);
      if (files.length === 2) {
        emitter.emit("progress", { event: "merge-start" });
        try {
          await mergeMedia(files, options.output, [], ffmpegBinPath);
          emitter.emit("progress", { event: "merge-end" });
          clean();
          emitter.emit("completed", options.output);
        } catch (error) {
          emitter.emit("error", { error: String(error) });
        }
      }
    });
    emitter.on("error", () => {
      clean();
    });

    videoDownloader.start();
    audioDownloader.start();

    const task = {
      pause: () => {
        videoDownloader.pause();
        audioDownloader.pause();
      },
      start: () => {
        videoDownloader.start();
        audioDownloader.start();
      },
      cancel: () => {
        videoDownloader.cancel();
        audioDownloader.cancel();
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
       */
      add: (params: { root?: number; parent?: number; message: string }) => {
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
