import type { CommonResponse, Request, UploadResponse } from "~/types";
import path from "path";
import fs from "fs";
import cookie from "cookie";

export const preupload = async (
  request: Request,
  filePath: string
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
> => {
  const { base } = path.parse(filePath);
  const size = await getFileSize(filePath);
  return request.get("https://member.bilibili.com/preupload", {
    params: {
      zone: "cs",
      upcdn: "bldsa",
      probe_version: "20221109",
      name: base,
      r: "upos",
      profile: "ugcfx/bup",
      ssl: "0",
      version: "2.14.0.0",
      build: "2140000",
      size: size,
      webVersion: "2.14.0",
    },
  });
};

export const preuploadMeta = async (
  request: Request
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
> => {
  return request.get("https://member.bilibili.com/preupload", {
    params: {
      name: "file_meta.txt",
      size: 2000,
      r: "upos",
      profile: "fxmeta/bup",
      ssl: "0",
      version: "2.14.0.0",
      build: "2140000",
      webVersion: "2.14.0",
    },
  });
};

export const getUploadInfo = async (
  request: Request,
  url: string,
  filePath: string,
  biz_id: number,
  chunk_size: number,
  // meta_upos_uri: string,
  auth: string
): Promise<
  UploadResponse<{
    OK: number;
    bucket: string;
    key: string;
    upload_id: string;
  }>
> => {
  const size = await getFileSize(filePath);
  return request.post(url, "", {
    params: {
      uploads: "",
      output: "json",
      profile: "ugcfx/bup",
      filesize: size,
      partsize: chunk_size,
      // meta_upos_uri: meta_upos_uri,
      biz_id: biz_id,
    },
    headers: {
      "X-Upos-Auth": auth,
    },
  });
};

async function uploadChunk(
  request: Request,
  url: string,
  filePath: string,
  auth: string,
  uploadId: string,
  chunk_size: number
) {
  const size = await getFileSize(filePath);
  const chunks = Math.ceil(size / chunk_size);

  // const paramsArray = [];
  //
  // for (let i = 0; i < chunks; i++) {
  //   paramsArray.push({
  //     uploadId: uploadId,
  //     partNumber: i + 1,
  //     chunk: i,
  //     chunks: chunks,
  //     size: chunk_size,
  //     start: i * chunk_size,
  //     end: (i + 1) * chunk_size,
  //     total: size,
  //   });
  // }
  fs.readFile(filePath, async (err, data) => {
    if (err) throw err;

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

      const res = await request.put(url, chunkData, {
        params: params,
        headers: {
          "X-Upos-Auth": auth,
        },
        proxy: {
          host: "127.0.0.1",
          port: 9999,
          protocol: "http",
        },
      });
      console.log("data", res.data);

      // 写入切片文件
      // fs.writeFile(chunkFileName, chunkData, err => {
      //   if (err) throw err;
      //   console.log(`Chunk ${i + 1} created: ${chunkFileName}`);
      // });
    }
  });
}

interface MediaOptions {
  cover?: string;
  title: string;
  copyright?: 0 | 1;
  tid: number;
  tag: string;
  desc?: string;
  dynamic?: string;
  dolby?: 0 | 1;
  lossless_music?: 0 | 1;
}

async function submit(
  request: Request,
  cookieString: string,
  biz_id: number,
  filename: string,
  options: MediaOptions
): Promise<
  CommonResponse<{
    aid: number;
    bvid: string;
  }>
> {
  console.log(cookie.parse(cookieString));
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
    videos: [
      {
        filename: "",
        title: "",
        desc: "",
        cid: 0,
      },
    ],
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

  data.videos[0] = {
    filename: filename,
    title: "录制-27430232-20231114-100239-728-张三普法1-45",
    desc: "",
    cid: biz_id,
  };
  console.log("submit", data);

  return request.post("https://member.bilibili.com/x/vu/web/add/v3", data, {
    params: {
      t: Date.now(),
      csrf: crsf,
    },
  });
}

export const upload = async (
  request: Request,
  cookieString: string,
  filePath: string,
  options: MediaOptions
) => {
  const res = await preupload(request, filePath);
  console.log("preupload", res.data);

  const { endpoint, upos_uri, biz_id, chunk_size, auth } = res.data;
  const url = `https:${endpoint}/${upos_uri.slice(7)}`;
  console.log("url", url);

  const uploadInfo = (
    await getUploadInfo(
      request,
      url,
      filePath,
      biz_id,
      chunk_size,
      // meta_upos_uri,
      auth
    )
  ).data;
  console.log("uploadInfo", uploadInfo);

  await uploadChunk(
    request,
    url,
    filePath,
    auth,
    uploadInfo.upload_id,
    chunk_size
  );
  const res2 = await submit(
    request,
    cookieString,
    biz_id,
    uploadInfo.key.replaceAll("/", "").split(".")[0],
    options
  );
  console.log("submit", res2.data);
  return res2.data;
};

async function getFileSize(filePath: string) {
  try {
    const stats = await fs.promises.stat(filePath);
    // 获取文件大小（以字节为单位）
    const fileSizeInBytes = stats.size;
    // 将文件大小转换为其他单位（如KB、MB、GB等）
    const fileSizeInKB = fileSizeInBytes / 1024;
    // const fileSizeInMB = fileSizeInKB / 1024;
    // const fileSizeInGB = fileSizeInMB / 1024;

    // console.log("File Size (Bytes):", fileSizeInBytes);
    // console.log("File Size (KB):", fileSizeInKB);
    // console.log("File Size (MB):", fileSizeInMB);
    // console.log("File Size (GB):", fileSizeInGB);
    return fileSizeInBytes;
  } catch (err) {
    console.error("Error reading file:", err);
  }
}
