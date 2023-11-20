import type { Request } from "~/types/index.d.ts";
/**
 * 检查tag是否可用
 * @param _request 实例
 * @param tag 需要检查的tag
 * @returns
 */
export async function checkTag(_request: Request, tag: string) {
  return _request.get(
    `https://member.bilibili.com/x/vupre/web/topic/tag/check`,
    {
      params: {
        tag: tag,
      },
    }
  );
}
