import type {
  CommonResponse,
  Request,
  UploadResponse,
  MediaOptions,
} from "~/types/index.d.ts";

export const getArchives = (
  request: Request,
  params?: {
    keyword?: string; // 关键词
    status?: "is_pubing" | "pubed" | "not_pubed" | "is_pubing,pubed,not_pubed"; // 投稿状态，不传是全部，"is_pubing"是进行中，"pubed"是已通过，"not_pubed"是未通过
    pn: number; // 页码
    ps: number; // 每页数量
    coop?: number; // 未知，传1
    interactive?: number; // 未知，传1
    tid?: number; // 分区id，不传是全部
    order?: "click" | "stow" | "dm_count" | "scores"; // 不传是投稿时间排序，"click"是播放量排序，"stow"是收藏量排序，"dm_count"是弹幕数排序，"scores"是评论排序
  }
): Promise<
  CommonResponse<{
    arc_audits: {
      stat: {
        aid: number;
      };
      Archive: {
        cover: string;
        title: string;
        tag: string;
        tid: number;
      };
    }[];
    page: {
      pn: number;
      ps: number;
      count: number;
    };
  }>
> => {
  const defaultParams = {
    pn: 1,
    ps: 20,
    coop: 1,
    interactive: 1,
  };
  return request.get("https://member.bilibili.com/x/web/archives", {
    params: {
      pn: 1,
      ps: 20,
      tid: 0,
      keyword: "",
      order: "pubdate",
      jsonp: "jsonp",
      _: Date.now(),
      ...defaultParams,
      ...params,
    },
  });
};
