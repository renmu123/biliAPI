import { Client, TvQrcodeLogin, Auth, User, utils } from "./dist/index.js";
import fs from "fs";

// 上传视频
async function upload() {
  const client = new Client();
  await client.loadCookieFile("cookies.json");
  const task = await client.platform.addMedia(["test.mp4"], {
    title: "测试",
    tid: 138,
    tag: "测试",
  });
  task.on("completed", res => {
    console.log("completed upload", res);
  });
  task.on("progress", res => {
    console.log("progress", res);
  });

  // 暂停任务
  task.pause();
  // 继续任务
  task.start();
  // 取消任务
  task.cancel();
}

// 二维码登录
async function qrcodeLogin() {
  const tv = new TvQrcodeLogin();
  const url = await tv.login();
  console.log(url);

  tv.on("completed", res => {
    console.log("completed", res);
    fs.writeFileSync("cookie.json", JSON.stringify(res.data));
  });
  tv.on("error", res => {
    console.log("err", res);
  });
  tv.on("scan", res => {
    console.log("scan", res);
  });
  tv.on("end", res => {
    console.log("end", res);
  });

  // 中断任务，并清除所有监听器
  // tv.interrupt();
}

// 获取登录用户信息
async function getMyInfo() {
  const client = new Client();
  await client.loadCookieFile("cookies.json");
  const data = await client.user.getMyInfo();
  console.log(data);
}

const getMyInfo2 = async () => {
  const auth = new Auth();
  await auth.loadCookieFile("cookies.json");
  const user = new User(auth);
  const res = await user.getMyInfo();
  console.log(res);
};

// 获取用户信息
async function getUserInfo() {
  const client = new Client();
  const data = await client.user.getUserInfo(10995238);
  console.log(data);
}

// 获取主播信息
async function getMasterInfo() {
  const client = new Client();
  const data = await client.live.getMasterInfo(10995238);
  console.log(data);
}

// 下载弹幕
const convertDm = async () => {
  const client = new Client();
  // client.loadCookieFile("cookie2.json");
  const data = await client.video.getAllDm({
    aid: 114108254919086,
    cid: 28699528643,
  });
  const xmlContent = await utils.protoBufToXml(data);
  fs.writeFileSync("test.xml", xmlContent);
};
