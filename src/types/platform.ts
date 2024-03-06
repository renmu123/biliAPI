interface ParentTP {
  id: number;
  parent: number;
  name: string;
}

interface TP {
  id: number;
  parent: number;
  name: string;
}

interface TPInfo {
  parent_tp: ParentTP;
  tp: TP;
}

interface Attrs {
  is_coop: number;
  is_owner: number;
  is_dynamic: number;
  is_360: number;
  is_dolby: number;
  no_public: number;
  live: number;
  is_premiere: number;
  is_played: number;
  lossless_music: number;
}

interface Video {
  aid: number;
  bvid: string;
  title: string;
  desc: string;
  filename: string;
  cid: number;
  duration: number;
  index: number;
  status: number;
  status_desc: string;
  reject_reason: string;
  reject_reason_url: string;
  fail_code: number;
  fail_desc: string;
  xcode_state: number;
  ctime: number;
}

interface Watermark {
  id: number;
  mid: number;
  uname: string;
  state: number;
  type: number;
  position: number;
  url: string;
  md5: string;
  info: string;
  tip: string;
  ctime: string;
  mtime: string;
}

interface Archive {
  aid: number;
  bvid: string;
  mid: number;
  tid: number;
  tp_info: TPInfo;
  title: string;
  author: string;
  cover: string;
  reject_reason: string;
  reject_reason_url: string;
  tag: string;
  duration: number;
  copyright: 1 | 2;
  no_reprint: 0 | 1;
  ugcpay: number;
  order_id: number;
  order_name: string;
  adorder_id: number;
  adorder_name: string;
  adorder_no: string;
  online_time: number;
  new_adorder_info: any; // replace with the actual type if available
  desc: string;
  mission_id: number;
  mission_name: string;
  attribute: number;
  state: number;
  state_desc: string;
  state_panel: number;
  source: string;
  desc_format_id: number;
  attrs: Attrs;
  porder: any; // replace with the actual type if available
  dynamic: string;
  poi_object: any; // replace with the actual type if available
  dtime: number;
  ptime: number;
  ctime: number;
  ugcpay_info: any; // replace with the actual type if available
  staffs: any[]; // replace with the actual type if available
  vote: any; // replace with the actual type if available
  activity: any; // replace with the actual type if available
  interactive: number;
  hl: any; // replace with the actual type if available
  no_background: number;
  dynamic_video: number;
  no_public: number;
  is_360: -1 | 1;
  is_dolby: 0 | 1;
  lossless_music: 0 | 1;
  bs_editor: number;
  up_from: number;
  desc_v2: any; // replace with the actual type if available
  dynamic_v2: any; // replace with the actual type if available
  topic_id: number;
  topic_name: string;
  topic_stat: number;
  premiere: number;
  is_ugcpay_v2: number;
  /** 是否允许二创：1：允许，-1：不允许 */
  recreate: -1 | 1;
  political_media: number;
  political_editable: number;
  charging_pay: number;
  neutral_mark: string;
}

interface Tip {
  id: number;
  type: number;
  title: string;
  content: string;
  link: string;
  dateline: number;
}

export interface MediaDetailReturnType {
  act_reserve_binded: any; // replace with the actual type if available
  act_reserve_create: boolean;
  arc_elec: {
    show: boolean;
    state: number;
    total: number;
    count: number;
    reason: string;
  };
  archive: Archive;
  /** 是否在合集中 */
  in_season: boolean;
  /** 是否推送到动态：0：不推送，1：推送 */
  no_disturbance: 0 | 1;
  origin_state: number;
  reply: {
    aid: number;
    state: number;
    up_selection: boolean;
  };
  show_staff: boolean;
  staffs: any[]; // replace with the actual type if available
  subtitle: {
    allow: boolean;
    lan: string;
    lan_doc: string;
    draft_list: any; // replace with the actual type if available
  };
  tip: Tip;
  videos: Video[];
  watermark: Watermark;
}

export interface getArchivesReturnType {
  arc_audits: {
    /* 审核中状态时，stat中的参数均为0  */
    stat: {
      aid: number;
      view: number;
      danmuku: number;
      reply: number;
      favorite: number;
      coin: number;
      share: number;
      now_rank: number;
      his_rank: number;
      like: number;
      dislike: number;
      vt: number;
      vv: number;
    };
    Archive: {
      aid: number;
      bvid: string;
      mid: number;
      cover: string;
      title: string;
      tag: string;
      tid: number;
      /* -30:审核中 0:审核通过 */
      state: -30 | 0 | number;
      [key: string]: any;
    };
    Videos: [];
    [key: string]: any;
  }[];
  page: {
    pn: number;
    ps: number;
    count: number;
  };
}

export type UploaderType = "web";
export type SubmitType = "web" | "client" | "b-cut";

export interface getSeasonListReturnType {
  play_type: 1 | number;
  total: number;
  seasons: {
    checkin: {
      season_status: 1 | number;
      status: 1 | number;
      status_reason: string;
    };
    part_episodes: Episode[];
    season: Season;
    seasonStat: {
      view: number;
      danmaku: number;
      reply: number;
      fav: number;
      coin: number;
      share: number;
      nowRank: number;
      hisRank: number;
      like: number;
      subscription: number;
      vt: number;
    };
    sections: {
      sections: Section[];
    };
  }[];
  tip: {
    title: string;
    url: string;
  };
}

export interface Season {
  /** 合集id */
  id: number;
  title: string;
  desc: string;
  cover: string;
  isEnd: number;
  mid: number;
  isAct: number;
  is_pay: number;
  state: number;
  partState: number;
  signState: number;
  rejectReason: string;
  ctime: number;
  mtime: number;
  no_section: number;
  forbid: number;
  protocol_id: string;
  ep_num: number;
  season_price: number;
  is_opened: number;
}

export interface Section {
  cover: string;
  ctime: number;
  epCount: number;
  id: number;
  mtime: number;
  order: number;
  partState: number;
  rejectReason: string;
  seasonId: number;
  state: number;
  title: string;
  type: number;
}

export interface Episode {
  aid: number;
  aid_owner: boolean;
  archiveTitle: string;
  archiveState: number;
  bvid: string;
  cid: number;
  cover: string;
  id: number;
  is_free: number;
  order: number;
  partState: number;
  rejectReason: string;
  seasonId: number;
  sectionId: number;
  state: number;
  title: string;
  videoTitle: string;
}
