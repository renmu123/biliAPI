import type { Request, CommonResponse } from "~/types/index.d.ts";

export const getMyInfo = (
  request: Request
): Promise<
  CommonResponse<{
    coins: number;
    follower: number;
    following: number;
    level_exp: {
      current_exp: number;
      current_level: number;
      current_min: number;
      level_up: number;
      next_exp: number;
    };
    profile: {
      face: string;
      mid: number;
      name: string;
    };
  }>
> => {
  return request.get("https://api.bilibili.com/x/space/v2/myinfo");
};

/**
 * getMyInfo返回数据结构
 */
interface MyInfoReturnType {
  /** 用户ID */
  mid: number;
  /** 昵称 */
  name: string;
  /** 性别 (男, 女, 保密) */
  sex: string;
  /** 头像图片URL */
  face: string;
  /** 签名 */
  sign: string;
  /** 作用尚不明确的排名字段 */
  rank: number;
  /** 当前等级 (0-6级) */
  level: number;
  /** 作用尚不明确的加入时间 */
  jointime: number;
  /** 节操，默认70 */
  moral: number;
  /** 封禁状态 (0：正常, 1：被封) */
  silence: number;
  /** 邮箱验证状态 (0：未验证, 1：已验证) */
  email_status: number;
  /** 手机号验证状态 (0：未验证, 1：已验证) */
  tel_status: number;
  /** 作用尚不明确的认证信息 */
  identification: number;
  /**
   * 大会员状态
   */
  vip: {
    /** 会员类型 (0：无, 1：月大会员, 2：年度及以上大会员) */
    type: number;
    /** 会员状态 (0：无, 1：有) */
    status: number;
    /** 会员过期时间 (Unix时间戳，毫秒) */
    due_date: number;
    /** 作用尚不明确的主题类型 */
    theme_type: number;
    /** 会员标签 */
    label: {
      /** 作用尚不明确的路径 */
      path: string;
      /** 会员名称 */
      text: string;
      /** 会员标签 (vip：大会员, annual_vip：年度大会员, ten_annual_vip：十年大会员, hundred_annual_vip：百年大会员) */
      label_theme: string;
    };
    /** 是否显示会员图标 (0：不显示, 1：显示) */
    avatar_subscript: number;
    /** 会员昵称颜色 (颜色码) */
    nickname_color: string;
  };
  /** 生日 (时间戳) */
  birthday: number;
  /** 作用尚不明确的游客状态 */
  is_tourist: number;
  /** 作用尚不明确的假账号状态 */
  is_fake_account: number;
  /** 作用尚不明确的PIN提示状态 */
  pin_prompting: number;
  /** 作用尚不明确的删除状态 */
  is_deleted: number;
  /** 硬币数 */
  coins: number;
  /** 关注数 */
  following: number;
  /** 粉丝数 */
  follower: number;
  /**
   * 附加数据
   */
  data: {
    /**
     * 挂件信息
     */
    pendant: {
      /** 挂件ID */
      pid: number;
      /** 挂件名称 */
      name: string;
      /** 挂件图片URL */
      image: string;
      /** 作用尚不明确的过期时间 */
      expire: number;
    };
    /**
     * 勋章信息
     */
    nameplate: {
      /** 勋章ID */
      nid: number;
      /** 勋章名称 */
      name: string;
      /** 勋章图片URL (正常) */
      image: string;
      /** 勋章图片URL (小) */
      image_small: string;
      /** 勋章等级 */
      level: string;
      /** 勋章条件 */
      condition: string;
    };
    /**
     * 认证信息
     */
    Official: {
      /** 认证类型 (见用户认证类型一览) */
      role: number;
      /** 认证信息 */
      title: string;
      /** 认证备注 */
      desc: string;
      /** 是否认证 (-1：无, 0：认证) */
      type: number;
    };
    /**
     * 等级经验信息
     */
    level_exp: {
      /** 当前等级 (0-6级) */
      current_level: number;
      /** 当前等级从多少经验值开始 */
      current_min: number;
      /** 当前账户的经验值 */
      current_exp: number;
      /** 下一个等级所需的经验值 (不是还需要多少) */
      next_exp: number;
    };
  };
}

export default class User {
  request: Request;

  constructor(request: Request) {
    this.request = request;
  }
  getMyInfo(): Promise<CommonResponse<MyInfoReturnType>> {
    return this.request.get("https://api.bilibili.com/x/space/v2/myinfo");
  }
}
