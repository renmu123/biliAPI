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
