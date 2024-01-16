import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { XMLBuilder } from "fast-xml-parser";

import protobuf from "protobufjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const root = await protobuf.load(path.join(__dirname, "assets", "dm.proto"));
  const MyMessage = root.lookupType("DmSegMobileReply");
  const message = MyMessage.decode(buffer);
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
  const elems = mesages.elems.map((ele: Danmu) => {
    const data = {
      "@@p": "",
      "@@id": String(ele.id),
      "@@progress": String(ele.progress / 1000),
      "@@mode": String(ele.mode),
      "@@fontsize": String(ele.fontsize),
      "@@color": String(ele.color),
      "@@midHash": String(ele.midHash),
      "#text": String(ele.content),
      "@@ctime": String(ele.ctime),
      "@@pool": String(ele.pool || 0),
      "@@weight": String(ele.weight),
      "@@idStr": String(ele.idStr),
    };
    data["@@p"] = [
      data["@@progress"],
      data["@@mode"],
      data["@@fontsize"],
      data["@@color"],
      data["@@ctime"],
      data["@@pool"],
      data["@@midHash"],
      data["@@idStr"],
      data["@@weight"],
    ].join(",");
    return data;
  });
  const xmlContent = builder.build({
    i: {
      d: elems,
    },
  });
  return `
<?xml version="1.0" encoding="utf-8"?>
${xmlContent}`;
};
