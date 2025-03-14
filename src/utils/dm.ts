import { XMLBuilder } from "fast-xml-parser";
import { fromBinary, toJson } from "@bufbuild/protobuf";

import { DmSegMobileReplySchema } from "../assets/dm_pb.js";

interface Danmu {
  id: string;
  progress: number;
  mode: number;
  fontsize: number;
  color: number;
  midHash: string;
  content: string;
  ctime: string;
  weight: number;
  idStr: string;
  attr: number;
  pool?: number;
}

export const protobufDecode = async (buffer: Buffer) => {
  const message = toJson(
    DmSegMobileReplySchema,
    fromBinary(DmSegMobileReplySchema, new Uint8Array(buffer))
  );
  return message;
};

/**
 * 将protobuf解析的弹幕转换为xml
 * @param buffer protobuf解析的弹幕
 * @link https://socialsisteryi.github.io/bilibili-API-collect/docs/danmaku/danmaku_xml.html#xml%E6%A0%BC%E5%BC%8F%E7%BB%93%E6%9E%84
 * @link https://socialsisteryi.github.io/bilibili-API-collect/docs/danmaku/danmaku_proto.html#%E8%8E%B7%E5%8F%96%E5%AE%9E%E6%97%B6%E5%BC%B9%E5%B9%95
 */
export const protoBufToXml = async (buffer: Buffer) => {
  const mesages: any = await protobufDecode(buffer);
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@@",
    format: true,
  });
  const elems: {
    "@@p": string;
    "#text": string;
  }[] = [];
  for (let i = 0; i < mesages.elems.length; i++) {
    const ele = mesages.elems[i];
    if (!ele.progress) continue;

    elems.push({
      "@@p": [
        ele.progress / 1000,
        ele.mode,
        ele.fontsize,
        ele.color,
        ele.ctime,
        ele.pool || 0,
        ele.midHash,
        ele.idStr,
        ele.weight,
      ].join(","),
      "#text": ele.content,
    });
  }
  const xmlContent = builder.build({
    i: {
      d: elems,
    },
  });
  return `
<?xml version="1.0" encoding="utf-8"?>
${xmlContent}`;
};
