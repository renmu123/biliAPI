import path from "path";
import fs from "fs";
import cookie from "cookie";
import { getFileSize } from "~/utils/index.ts";

import type {
  CommonResponse,
  Request,
  UploadResponse,
  MediaOptions,
} from "~/types/index.d.ts";

export class WebVideoUploader {
  request: Request;
  filePaths: string[];

  constructor(request: Request, filePath: string[]) {
    this.request = request;
    this.filePaths = filePath;
  }

  async preupload(
    filePath: string,
    size: number
  ): Promise<
    UploadResponse<{
      OK: number;
      auth: string;
      biz_id: number;
      chunk_retry: number;
      chunk_retry_delay: number;
      chunk_size: number;
      endpoint: string;
      endpoints: string[];
      expose_params: any;
      put_query: string;
      threads: number;
      timeout: number;
      uip: string;
      upos_uri: string;
    }>
  > {
    const { base } = path.parse(filePath);
    return this.request.get("https://member.bilibili.com/preupload", {
      params: {
        zone: "cs",
        upcdn: "bldsa",
        probe_version: "20221109",
        name: base,
        r: "upos",
        profile: "ugcfx/bup",
        ssl: "0",
        version: "",
        build: "2140000",
        size: size,
        webVersion: "2.14.0",
      },
    });
  }

  async getUploadInfo(
    url: string,
    biz_id: number,
    chunk_size: number,
    auth: string,
    size: number
  ): Promise<
    UploadResponse<{
      OK: number;
      bucket: string;
      key: string;
      upload_id: string;
    }>
  > {
    return this.request.post(url, "", {
      params: {
        uploads: "",
        output: "json",
        profile: "ugcfx/bup",
        filesize: size,
        partsize: chunk_size,
        biz_id: biz_id,
      },
      headers: {
        "X-Upos-Auth": auth,
      },
    });
  }

  async uploadChunk(
    filePath: string,
    url: string,
    auth: string,
    uploadId: string,
    chunk_size: number,
    size: number
  ) {
    const chunks = Math.ceil(size / chunk_size);

    const data = await fs.promises.readFile(filePath);
    const numberOfChunks = Math.ceil(size / chunk_size);
    for (let i = 0; i < numberOfChunks; i++) {
      const start = i * chunk_size;
      const end = (i + 1) * chunk_size;
      const chunkData = data.slice(start, end);

      const params = {
        uploadId: uploadId,
        partNumber: i + 1,
        chunk: i,
        chunks: chunks,
        size: chunk_size,
        start: start,
        end: end,
        total: size,
      };
      console.log("params", params);

      const res = await this.request.put(url, chunkData, {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
      });
      console.log("chunk data", res.data);
    }
  }

  async upload() {
    const videos = [];
    for (let i = 0; i < this.filePaths.length; i++) {
      const filePath = this.filePaths[i];
      const { name: title } = path.parse(filePath);
      const size = await getFileSize(filePath);

      const res = await this.preupload(filePath, size);
      console.log("preupload", res.data);

      const { endpoint, upos_uri, biz_id, chunk_size, auth } = res.data;
      const url = `https:${endpoint}/${upos_uri.slice(7)}`;
      console.log("url", url);

      const uploadInfo = (
        await this.getUploadInfo(url, biz_id, chunk_size, auth, size)
      ).data;
      console.log("uploadInfo", uploadInfo);

      await this.uploadChunk(
        filePath,
        url,
        auth,
        uploadInfo.upload_id,
        chunk_size,
        size
      );

      videos.push({
        cid: biz_id,
        filename: uploadInfo.key.replaceAll("/", "").split(".")[0],
        title: title,
      });
    }
    return videos;
  }

  async upload_cover() {}
}

export async function addMediaWeb(
  request: Request,
  videos: { cid: number; filename: string; title: string; desc?: string }[],
  cookieString: string,
  options: MediaOptions
): Promise<
  CommonResponse<{
    aid: number;
    bvid: string;
  }>
> {
  checkOptions(options);
  const cookieObj = cookie.parse(cookieString);
  const crsf = cookieObj.bili_jct;
  const data = {
    copyright: 1,
    tid: 124,
    desc_format_id: 9999,
    desc: "",
    recreate: -1,
    dynamic: "",
    interactive: 0,
    videos: videos,
    act_reserve_create: 0,
    no_disturbance: 0,
    no_reprint: 1,
    subtitle: { open: 0, lan: "" },
    dolby: 0,
    lossless_music: 0,
    up_selection_reply: false,
    up_close_reply: false,
    up_close_danmu: false,
    web_os: 1,
    csrf: crsf,
    ...options,
  };

  console.log("submit", data);

  return request.post("https://member.bilibili.com/x/vu/web/add", data, {
    params: {
      t: Date.now(),
      csrf: crsf,
    },
  });
}

export async function addMediaClient(
  request: Request,
  videos: { cid: number; filename: string; title: string; desc?: string }[],
  accessKey: string,
  options: MediaOptions
): Promise<
  CommonResponse<{
    aid: number;
    bvid: string;
  }>
> {
  checkOptions(options);
  const data = {
    copyright: 1,
    tid: 124,
    desc_format_id: 9999,
    desc: "",
    recreate: -1,
    dynamic: "",
    interactive: 0,
    videos: videos,
    act_reserve_create: 0,
    no_disturbance: 0,
    no_reprint: 1,
    subtitle: { open: 0, lan: "" },
    dolby: 0,
    lossless_music: 0,
    up_selection_reply: false,
    up_close_reply: false,
    up_close_danmu: false,
    web_os: 1,
    ...options,
  };

  console.log("submit", data);

  return request.post("http://member.bilibili.com/x/vu/client/add", data, {
    params: {
      t: Date.now(),
      access_key: accessKey,
    },
  });
}

export async function editMedia(
  request: Request,
  videos: { cid: number; filename: string; title: string; desc?: string }[],
  cookieString: string,
  options: MediaOptions & { aid: number }
): Promise<
  CommonResponse<{
    aid: number;
    bvid: string;
  }>
> {
  checkOptions(options);
  const cookieObj = cookie.parse(cookieString);
  const crsf = cookieObj.bili_jct;
  const data = {
    copyright: 1,
    tid: 124,
    desc_format_id: 9999,
    desc: "",
    recreate: -1,
    dynamic: "",
    interactive: 0,
    videos: videos,
    act_reserve_create: 0,
    no_disturbance: 0,
    no_reprint: 1,
    subtitle: { open: 0, lan: "" },
    dolby: 0,
    lossless_music: 0,
    up_selection_reply: false,
    up_close_reply: false,
    up_close_danmu: false,
    web_os: 1,
    csrf: crsf,
    ...options,
  };

  console.log("edit submit", data);

  return request.post("https://member.bilibili.com/x/vu/web/edit", data, {
    params: {
      t: Date.now(),
      csrf: crsf,
    },
  });
}

function checkOptions(options: MediaOptions) {
  if (!options.title) throw new Error("title is required");
  if (!options.tag) throw new Error("tag is required");
  if (!options.tid) throw new Error("tid is required");
  return true;
}
