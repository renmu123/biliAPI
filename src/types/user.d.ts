/**
 * getMyInfo返回数据结构
 */
export type MyInfoReturnType = {
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
};

/**
 * getUserInfo返回的数据解构
 */
export interface GetUserInfoReturnType {
  /** 用户ID */
  mid: number;
  /** 昵称 */
  name: string;
  /** 性别，男/女/保密 */
  sex: string;
  /** 头像链接 */
  face: string;
  /** 是否为 NFT 头像 (0: 不是, 1: 是) */
  face_nft: number;
  /** NFT 头像类型 */
  face_nft_type: number;
  /** 签名 */
  sign: string;
  /** 用户权限等级 */
  rank: number;
  /** 当前等级 (0-6级) */
  level: number;
  /** 注册时间，此接口返回恒为0 */
  jointime: number;
  /** 节操值，此接口返回恒为0 */
  moral: number;
  /** 封禁状态 (0: 正常, 1: 被封) */
  silence: number;
  /** 硬币数，需要登录（Cookie），只能查看自己的，默认为0 */
  coins: number;
  /** 是否具有粉丝勋章 (false: 无, true: 有) */
  fans_badge: boolean;
  /** 粉丝勋章信息 */
  fans_medal?: {
    /** 是否展示 */
    show: boolean;
    /** 是否佩戴了粉丝勋章 */
    wear: boolean;
    /** 粉丝勋章详细信息 */
    medal: {
      /** 用户ID */
      uid: number;
      /** 粉丝勋章所属UP的用户ID */
      target_id: number;
      /** 粉丝勋章ID */
      medal_id: number;
      /** 粉丝勋章等级 */
      level: number;
      /** 粉丝勋章名称 */
      medal_name: string;
      /** 粉丝勋章颜色 */
      medal_color: number;
      /** 当前亲密度 */
      intimacy: number;
      /** 下一等级所需亲密度 */
      next_intimacy: number;
      /** 每日亲密度获取上限 */
      day_limit: number;
      /** 今日已获得亲密度 */
      today_feed: number;
      /** 粉丝勋章颜色（起始值） */
      medal_color_start: number;
      /** 粉丝勋章颜色（结束值） */
      medal_color_end: number;
      /** 粉丝勋章边框颜色 */
      medal_color_border: number;
      /** 是否点亮 */
      is_lighted: number;
      /** 点亮状态 */
      light_status: number;
      /** 当前是否佩戴 (0: 未佩戴, 1: 已佩戴) */
      wearing_status: number;
      /** 评分 */
      score: number;
    };
  };
  /** 官方认证信息 */
  official?: {
    /** 认证类型，见用户认证类型一览 */
    role: number;
    /** 认证信息，无为空 */
    title: string;
    /** 认证备注，无为空 */
    desc: string;
    /** 是否认证 (-1: 无, 0: 个人认证, 1: 机构认证) */
    type: number;
  };
  /** 会员信息 */
  vip?: {
    /** 会员类型 (0: 无, 1: 月大会员, 2: 年度及以上大会员) */
    type: number;
    /** 会员状态 (0: 无, 1: 有) */
    status: number;
    /** 会员过期时间，毫秒时间戳 */
    due_date: number;
    /** 支付类型 (0: 未支付，1: 已支付) */
    vip_pay_type: number;
    /** 0，作用尚不明确 */
    theme_type: number;
    /** 会员标签信息 */
    label?: {
      /** 空，作用尚不明确 */
      path: string;
      /** 会员类型文案 */
      text: string;
      /** 会员标签 (vip: 大会员, annual_vip: 年度大会员, ...) */
      label_theme: string;
      /** 会员标签颜色 */
      text_color: string;
      /** 1 */
      bg_style: number;
      /** 会员标签背景颜色，颜色码，一般为 #FB7299，曾用于愚人节改变大会员配色 */
      bg_color: string;
      /** 会员标签边框颜色，未使用 */
      border_color: string;
      /** true */
      use_img_label: boolean;
      /** 空串 */
      img_label_uri_hans: string;
      /** 空串 */
      img_label_uri_hant: string;
      /** 大会员牌子图片，简体版 */
      img_label_uri_hans_static: string;
      /** 大会员牌子图片，繁体版 */
      img_label_uri_hant_static: string;
    };
    /** 是否显示会员图标 (0: 不显示, 1: 显示) */
    avatar_subscript: number;
    /** 会员昵称颜色，颜色码，一般为 #FB7299，曾用于愚人节改变大会员配色 */
    nickname_color: string;
    /** 大角色类型 (1: 月度大会员, 3: 年度大会员, 7: 十年大会员, 15: 百年大会员) */
    role: number;
    /** 大会员角标地址 */
    avatar_subscript_url: string;
    /** 电视大会员状态 (0: 未开通, ...) */
    tv_vip_status: number;
    /** 电视大会员支付类型 */
    tv_vip_pay_type: number;
  };
  /** 头像框信息 */
  pendant?: {
    /** 头像框id */
    pid: number;
    /** 头像框名称 */
    name: string;
    /** 头像框图片url */
    image: string;
    /** 过期时间，此接口返回恒为0 */
    expire: number;
    /** 头像框图片url */
    image_enhance: string;
    /** 头像框图片逐帧序列url */
    image_enhance_frame: string;
  };
  /** 勋章信息 */
  nameplate?: {
    /** 勋章id */
    nid: number;
    /** 勋章名称 */
    name: string;
    /** 勋章图标 */
    image: string;
    /** 勋章图标（小） */
    image_small: string;
    /** 勋章等级 */
    level: string;
    /** 获取条件 */
    condition: string;
  };
  /** 用户荣誉信息 */
  user_honour_info?: {
    mid: number;
    colour: string | null;
    tags: string[] | null;
  };
  /** 是否关注此用户 (true: 已关注, false: 未关注)，需要登录（Cookie），未登录恒为false */
  is_followed: boolean;
  /** 主页头图链接 */
  top_photo: string;
  /** 主题信息 */
  theme?: {
    [key: string]: any;
  };
  /** 系统通知信息 */
  sys_notice?: {
    /** 通知ID */
    id: number;
    /** 显示文案 */
    content: string;
    /** 跳转地址 */
    url: string;
    /** 提示类型 (1,2) */
    notice_type: number;
    /** 前缀图标 */
    icon: string;
    /** 文字颜色 */
    text_color: string;
    /** 背景颜色 */
    bg_color: string;
  };
  /** 直播间信息 */
  live_room?: {
    /** 直播间状态 (0: 无房间, 1: 有房间) */
    roomStatus: number;
    /** 直播状态 (0: 未开播, 1: 直播中) */
    liveStatus: number;
    /** 直播间网页 url */
    url: string;
    /** 直播间标题 */
    title: string;
    /** 直播间封面 url */
    cover: string;
    /** 观看统计信息 */
    watched_show: {
      switch: boolean;
      /** total watched users */
      num: number;
      text_small: string;
      text_large: string;
      /** watched icon url */
      icon: string;
      icon_location: string;
      /** watched icon url */
      icon_web: string;
    };
    /** 直播间 id(短号) */
    roomid: number;
    /** 轮播状态 (0: 未轮播, 1: 轮播) */
    roundStatus: number;
    /** 0 */
    broadcast_type: number;
  };
  /** 生日，MM-DD，如设置隐私为空 */
  birthday: string;
  /** 学校信息 */
  school?: {
    /** 就读大学名称，没有则为空 */
    name: string;
  };
  /** 职业信息 */
  profession?: {
    /** 资质名称 */
    name: string;
    /** 职位 */
    department: string;
    /** 所属机构 */
    title: string;
    /** 是否显示 (0: 不显示, 1: 显示) */
    is_show: number;
  };
  /** 个人标签 */
  tags: null;
  /** 系列信息 */
  series?: {
    /** (?), user_upgrade_status */
    user_upgrade_status: number;
    /** (?), show_upgrade_window */
    show_upgrade_window: boolean;
  };
  /** 是否为硬核会员 (0: 否, 1: 是) */
  is_senior_member: number;
  /** (?), mcn_info */
  mcn_info: null;
  /** (?), gaia_res_type */
  gaia_res_type: number;
  /** (?), gaia_data */
  gaia_data: null;
  /** (?), is_risk */
  is_risk: boolean;
  /** 充电信息 */
  elec?: {
    show_info: {
      /** 是否开通了充电 */
      show: boolean;
      /** 状态 (-1: 未开通, 1: 已开通) */
      state: number;
      /** 空串 */
      title: string;
      /** 空串 */
      icon: string;
      /** 空串 */
      jump_url: string;
    };
  };
  /** 合同信息 */
  contract?: {
    /** true/false，在页面中未使用此字段 */
    is_display: boolean;
    /** 是否在显示老粉计划 (true: 显示, false: 不显示) */
    is_follow_display: boolean;
  };
}
