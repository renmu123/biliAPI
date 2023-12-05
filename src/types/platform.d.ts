export type MediaDetailReturnType = {
  act_reserve_binded: any;
  act_reserve_create: boolean;
  arc_elec: {
    show: boolean;
    state: number;
    total: number;
    count: number;
    reason: string;
  };
  archive: {
    // 视频aid
    aid: number;
    // 视频bvid
    bvid: string;
    // 用户id
    mid: number;
    // 分区id
    tid: number;
    tp_info: {
      parent_tp: {
        id: number;
        name: string;
      };
    };
  };
};
