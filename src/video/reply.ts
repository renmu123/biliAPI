import type { Request, CommonResponse, Client } from "../types/index";
import type { GenerateNumberRange } from "../types/utils";

export default class Reply {
  request: Request;
  client: Client;
  oid?: number;
  type?: number;

  constructor(client: Client, oid?: number, type?: number) {
    this.request = client.request;
    this.client = client;
    this.oid = oid;
    this.type = type;
  }
  /**
   * 设置评论区oid
   * @param oid 评论区oid
   */
  setOid(oid: number) {
    this.oid = oid;
  }
  /**
   * 设置评论区type
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   */
  setType(type: number) {
    this.type = type;
  }
  /**
   * 列表
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param sort 0: 按时间, 1: 按点赞, 2: 按回复
   * @param nohot 是否显示热评 0: 不显示, 1: 显示
   * @param pn 页码，默认1
   * @param ps 每页数量，默认20
   * @returns 参数太多，不想写了 @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E6%9D%A1%E7%9B%AE%E5%AF%B9%E8%B1%A1
   */
  async list(params: {
    oid?: number;
    type?: number;
    sort?: 0 | 1 | 2;
    nohot?: 0 | 1;
    pn?: number;
    ps?: GenerateNumberRange<1, 20>;
  }): Promise<
    CommonResponse<{
      [key: string]: any;
    }>
  > {
    const url = `https://api.bilibili.com/x/v2/reply`;
    const data = {
      oid: this.oid,
      type: this.type,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.get(url, {
      params: data,
    });
  }

  /**
   * 评论个数
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   */
  async count(params: { oid?: number; type?: number }): Promise<
    CommonResponse<{
      count: number;
    }>
  > {
    const url = `https://api.bilibili.com/x/v2/reply/count`;
    const data = {
      oid: this.oid,
      type: this.type,
      ...params,
    };
    return this.request.get(url, {
      params: data,
    });
  }

  /**
   * 添加评论
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param root 评论根节点id
   * @param parent 评论父节点id
   * @param message 评论内容
   * @param plat 评论平台, 1: web, 2: 安卓, 3: ios, 4: wp
   */
  async add(params: {
    oid?: number;
    type?: number;
    root?: number;
    parent?: number;
    message: string;
    plat: 1 | 2 | 3 | 4;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/add`;
    const data = {
      oid: this.oid,
      type: this.type,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 评论点赞
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param rpid 评论id
   * @param action 1: 点赞, 0: 取消点赞
   */
  async like(params: {
    oid?: number;
    type?: number;
    rpid: number;
    action: 1 | 0;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/action`;
    const data = {
      type: this.type,
      oid: this.oid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 评论点踩
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param rpid 评论id
   * @param action 1: 点踩, 0: 取消点踩
   */
  async hate(params: {
    oid?: number;
    type?: number;
    rpid: number;
    action: 1 | 0;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/hate`;
    const data = {
      type: this.type,
      oid: this.oid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 评论删除
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param rpid 评论id
   */
  async delete(params: {
    oid?: number;
    type?: number;
    rpid: number;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/del`;
    const data = {
      type: this.type,
      oid: this.oid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 置顶评论
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param rpid 评论id
   * @param action 1: 置顶, 0: 取消置顶
   */
  async top(params: {
    oid?: number;
    type?: number;
    rpid: number;
    action: 1 | 0;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/top`;
    const data = {
      type: this.type,
      oid: this.oid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
  /**
   * 举报评论
   * @param oid 目标评论区id,如果是稿件则为aid
   * @param type @link https://socialsisteryi.github.io/bilibili-API-collect/docs/comment/#%E8%AF%84%E8%AE%BA%E5%8C%BA%E7%B1%BB%E5%9E%8B%E4%BB%A3%E7%A0%81
   * @param rpid 评论id
   * @param reason 举报理由 0: 其他 1: 垃圾广告 2: 色情 3: 刷屏 4: 引战 5: 剧透 6: 政治 7: 人身攻击 8: 内容不相关 9: 违法违规 10：低俗 11: 非法网站 12: 赌博诈骗 13: 传播不实信息 14:怂恿教唆信息 15:侵犯隐私 16:抢楼 17:青少年不良信息
   * @param content 举报内容 	reason=0时有效
   */
  async report(params: {
    oid?: number;
    type?: number;
    rpid: number;
    reason: number;
    content?: string;
  }): Promise<CommonResponse<{}>> {
    this.client.authLogin();
    const url = `https://api.bilibili.com/x/v2/reply/report`;
    const data = {
      type: this.type,
      oid: this.oid,
      ...params,
      csrf: this.client.cookieObj.bili_jct,
    };
    return this.request.post(url, {
      data,
    });
  }
}
