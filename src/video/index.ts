import Reply from "./reply";

import type { Request, CommonResponse, Client } from "../types/index";

export default class Video {
  request: Request;
  client: Client;
  aid?: number;

  constructor(client: Client, aid?: number) {
    this.request = client.request;
    this.client = client;
    this.aid = aid;
  }
  /**
   * 设置视频aid
   * @param aid 视频aid
   */
  setAid(aid: number) {
    this.aid = aid;
  }
  /**
   * 点赞
   * @param aid 视频aid
   * @param like 点赞或取消点赞
   */
  async like(params: {
    aid?: number;
    like: boolean;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/archive/like`;
    const data = {
      aid: params.aid ?? this.aid,
      like: params.like ? "1" : "2",
      csrf: this.client.cookieObj.bili_jct,
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
  async coin(params: {
    aid?: number;
    multiply: "1" | "2";
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/coin/add`;
    const data = {
      aid: this.aid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 列出收藏夹
   * @param aid aid
   * @param type 收藏夹类型，默认2
   * @param up_mid 用户id
   */
  async listFavoriteBox(params?: {
    aid?: number;
    type: number;
    up_mid: number;
  }): Promise<
    CommonResponse<{
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
    }>
  > {
    this.client.authLogin();
    const data = {
      rid: params.aid ?? this.aid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
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
   * @param up_mid 用户id
   * @param add_media_ids 添加的视频id，英文逗号分隔
   * @param del_media_ids 删除的视频id，英文逗号分隔
   */
  async editFavoriteBox(params: {
    aid?: number;
    type: number;
    up_mid: number;
    add_media_ids?: string;
    del_media_ids?: string;
  }): Promise<
    CommonResponse<{
      prompt: boolean;
      ga_data: any;
      total_msg: string;
      success_num: number;
    }>
  > {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v3/fav/resource/deal`;
    const data = {
      rid: params.aid ?? this.aid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data: data,
    });
  }
  /**
   * 增加分享次数
   * @param aid 视频aid
   */
  async addShare(params?: { aid?: number }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/share/add`;
    const data = {
      aid: params.aid ?? this.aid,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 一键三连
   * @param aid 视频aid
   */
  async likeCoinShare(params?: { aid?: number }): Promise<
    CommonResponse<{
      like: boolean;
      coin: boolean;
      fav: boolean;
      multiply: number;
      id_risk: boolean;
      gaia_res_type: number;
      gaia_data: any;
    }>
  > {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/web-interface/archive/like/triple`;
    const data = {
      aid: params.aid ?? this.aid,
      csrf: this.client.cookieObj.bili_jct,
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
  async getInfo(params: { aid?: number; bvid?: string }): Promise<
    CommonResponse<{
      [key: string]: any;
    }>
  > {
    const url = `https://api.bilibili.com/x/web-interface/view`;
    const data = {
      aid: params.aid ?? this.aid,
    };
    return this.request.get(url, {
      params: data,
    });
  }
  private authAid() {
    if (!this.aid) {
      throw new Error("aid is should be set");
    }
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
    const _reply = new Reply(this.client, this.aid);

    return {
      /**
       * 设置oid
       * @param oid 视频aid
       */
      setOid: (oid: number) => {
        replyParams.oid = oid;
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
