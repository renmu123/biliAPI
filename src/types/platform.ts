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
  copyright: number;
  no_reprint: number;
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
  is_360: number;
  is_dolby: number;
  lossless_music: number;
  bs_editor: number;
  up_from: number;
  desc_v2: any; // replace with the actual type if available
  dynamic_v2: any; // replace with the actual type if available
  topic_id: number;
  topic_name: string;
  topic_stat: number;
  premiere: number;
  is_ugcpay_v2: number;
  recreate: any; // replace with the actual type if available
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
  in_season: boolean;
  no_disturbance: number;
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
