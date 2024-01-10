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
  [key: string]: any;
}

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
      id: number;
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
    }[];
    audio: {
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
    }[];
  };
  high_format?: string;
  last_play_time: number;
  last_play_cid: number;
  [key: string]: any;
}
