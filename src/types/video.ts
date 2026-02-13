export interface VideoDetailReturnType {
  View: {
    aid: number;
    bvid: string;
    videos: number;
    tid: number;
    tname: string;
    pic: string;
    title: string;
    pubdate: number;
    ctime: number;
    desc: string;
    state: number;
    attribute: number;
    duration: number;
    rights: {
      bp: number;
      elec: number;
      download: number;
      movie: number;
      pay: number;
      hd5: number;
      no_reprint: number;
      autoplay: number;
      ugc_pay: number;
      is_cooperation: number;
      ugc_pay_preview: number;
      no_background: number;
    };
    owner: {
      mid: number;
      name: string;
      face: string;
    };
    stat: {
      aid: number;
      view: number;
      danmaku: number;
      reply: number;
      favorite: number;
      coin: number;
      share: number;
      now_rank: number;
      his_rank: number;
      like: number;
      dislike: number;
      evaluation: string;
      argue_msg: string;
    };
    dynamic: string;
    cid: number;
    dimension: {
      width: number;
      height: number;
      rotate: number;
    };
    no_cache: boolean;
    pages: {
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
    }[];
    subtitle: {
      allow_submit: boolean;
      list: any[];
    };
    user_garb: {
      url: string;
      count: number;
      list: any[];
    };
    relate_jump: {
      uri: string;
      param: string;
    };
    video_rec: {
      title: string;
      cover: string;
      uri: string;
      param: string;
    };
    staff: any;
    req_user: {
      uid: number;
      isLogin: boolean;
      role: number;
      isBvPower: boolean;
      isBvSelf: boolean;
      isBvTop: boolean;
      isBvDelete: boolean;
    };
  };
  Card: {
    card: {
      mid: number;
      name: string;
    };
  };
}

interface Audio {
  id: number;
  baseUrl: string;
  backupUrl: string[];
  bandwidth: number;
  mimeType: string;
  codecs: string;
  audioQuality: string;
  audioChannelCount: number;
  audioSamplingRate: string;
  segmentBase: {
    Initialization: {
      range: string;
    };
    RepresentationIndex: {
      range: string;
    };
  };
  segmentList: {
    duration: number;
    timescale: number;
    startNumber: number;
    initialization: {
      sourceURL: string;
      range: string;
    };
    segmentURL: {
      media: string;
      mediaRange: string;
    }[];
  };
  segmentTemplate: {
    timescale: number;
    initialization: {
      sourceURL: string;
      range: string;
    };
    segmentTimeline: {
      startNumber: number;
      duration: number;
      repeatCount: number;
    }[];
    segmentURL: {
      media: string;
      mediaRange: string;
    }[];
  };
}

export type VideoQn =
  | 6
  | 16
  | 32
  | 64
  | 72
  | 80
  | 100
  | 112
  | 116
  | 120
  | 125
  | 126
  | 127;

export type VideoCodec = 7 | 12 | 13;

export interface PlayUrlReturnType {
  from: string;
  result: string;
  quality: number;
  format: string;
  timelength: number;
  accept_format: string;
  accept_description: string[];
  accept_quality: number[];
  video_codecid: number;
  seek_param: string;
  seek_type: string;
  durl?: {
    order: number;
    length: number;
    size: number;
    ahead: string;
    vhead: string;
    url: string;
    backup_url: string[];
  }[];
  dash?: {
    duration: number;
    minBufferTime: number;
    minBufferTimeSliced: number;
    video: {
      id: VideoQn;
      baseUrl: string;
      backupUrl: string[];
      bandwidth: number;
      mimeType: string;
      codecs: string;
      width: number;
      height: number;
      frameRate: string;
      sar: string;
      startWithSAP: number;
      segmentBase: {
        Initialization: {
          range: string;
        };
        RepresentationIndex: {
          range: string;
        };
      };
      segmentList: {
        duration: number;
        timescale: number;
        startNumber: number;
        initialization: {
          sourceURL: string;
          range: string;
        };
        segmentURL: {
          media: string;
          mediaRange: string;
        }[];
      };
      segmentTemplate: {
        timescale: number;
        initialization: {
          sourceURL: string;
          range: string;
        };
        segmentTimeline: {
          startNumber: number;
          duration: number;
          repeatCount: number;
        }[];
        segmentURL: {
          media: string;
          mediaRange: string;
        }[];
      };
      codecid: VideoCodec;
    }[];
    audio: Audio[];
    dolby?: {
      type: string;
      audio: Audio[];
    };
    flac: null | any;
  };
  high_format?: string;
  last_play_time: number;
  last_play_cid: number;
  support_formats: {
    quality: VideoQn;
    format: string;
    new_description: string;
    display_desc: string;
    superscript: string;
    codecs: string[];
  }[];
  [key: string]: any;
}

interface Elechighlevel {
  privilege_type: number;
  title: string;
  sub_title: string;
  show_button: boolean;
  button_text: string;
  jump_url: string;
  intro: string;
  new: boolean;
  question_text: string;
  qa_title: string;
}

interface Showswitch {
  long_progress: boolean;
}

interface Fawkes {
  config_version: number;
  ff_version: number;
}

interface Onlineswitch {
  enable_gray_dash_playback: string;
  new_broadcast: string;
  realtime_dm: string;
  subtitle_submit_switch: string;
}

interface Guideattention {
  type: number;
  from: number;
  to: number;
  pos_x: number;
  pos_y: number;
}

interface Options {
  is_360: boolean;
  without_vip: boolean;
}

interface Subtitle {
  allow_submit: boolean;
  lan: string;
  lan_doc: string;
  subtitles: SubtitleItem[];
  subtitle_position?: any;
  font_size_type: number;
}

interface SubtitleItem {
  /** 这玩意超过了普通number上限 */
  id: bigint;
  lan: string;
  lan_doc: string;
  is_lock: boolean;
  /** 访问一下就是字幕了 */
  subtitle_url: string;
  subtitle_url_v2: string;
  type: number;
  id_str: string;
  ai_type: number;
  ai_status: number;
}

interface Vip {
  type: number;
  status: number;
  due_date: number;
  vip_pay_type: number;
  theme_type: number;
  label: Label;
  avatar_subscript: number;
  nickname_color: string;
  role: number;
  avatar_subscript_url: string;
  tv_vip_status: number;
  tv_vip_pay_type: number;
  tv_due_date: number;
  avatar_icon: Avataricon;
  ott_info: Ottinfo;
  super_vip: Supervip;
}

interface Supervip {
  is_super_vip: boolean;
}

interface Ottinfo {
  vip_type: number;
  pay_type: number;
  pay_channel_id: string;
  status: number;
  overdue_time: number;
}

interface Avataricon {
  icon_type: number;
  icon_resource: Iconresource;
}

interface Iconresource {
  type: number;
  url: string;
}

interface Label {
  path: string;
  text: string;
  label_theme: string;
  text_color: string;
  bg_style: number;
  bg_color: string;
  border_color: string;
  use_img_label: boolean;
  img_label_uri_hans: string;
  img_label_uri_hant: string;
  img_label_uri_hans_static: string;
  img_label_uri_hant_static: string;
  label_id: number;
  label_goto: Labelgoto;
}

interface Labelgoto {
  mobile: string;
  pc_web: string;
}

interface Levelinfo {
  current_level: number;
  current_min: number;
  current_exp: number;
  next_exp: number;
  level_up: number;
}

interface Ipinfo {
  ip: string;
  zone_ip: string;
  zone_id: number;
  country: string;
  province: string;
  city: string;
}
export interface PlayerInfoReturnType {
  aid: number;
  bvid: string;
  allow_bp: boolean;
  no_share: boolean;
  cid: number;
  max_limit: number;
  page_no: number;
  has_next: boolean;
  ip_info: Ipinfo;
  login_mid: number;
  login_mid_hash: string;
  is_owner: boolean;
  name: string;
  permission: string;
  level_info: Levelinfo;
  vip: Vip;
  answer_status: number;
  block_time: number;
  role: string;
  last_play_time: number;
  last_play_cid: number;
  now_time: number;
  online_count: number;
  need_login_subtitle: boolean;
  /** 字幕 */
  subtitle: Subtitle | null;
  view_points: unknown[];
  preview_toast: string;
  options: Options;
  guide_attention: Guideattention[];
  jump_card: unknown[];
  operation_card: unknown[];
  online_switch: Onlineswitch;
  fawkes: Fawkes;
  show_switch: Showswitch;
  bgm_info?: unknown;
  toast_block: boolean;
  is_upower_exclusive: boolean;
  is_upower_play: boolean;
  is_ugc_pay_preview: boolean;
  elec_high_level: Elechighlevel;
  disable_show_up_info: boolean;
  is_upower_exclusive_with_qa: boolean;
  arc_aigc?: unknown | null;
  self_visible?: unknown | null;
}
