import { Client, BiliQrcodeLogin } from "./dist/index.mjs";
import fs from "fs";

// 上传视频
async function upload() {
  const client = new Client();
  await client.loadCookieFile("cookies.json");
  const res = await client.platform.uploadMedia(["test.mp4"], {
    title: "测试",
    tid: 138,
    tag: "测试",
  });
  console.log(res);
}

// 二维码登录
async function qrcodeLogin() {
  const login = new BiliQrcodeLogin();
  const res = await login.getQrcode();

  console.log("res", res);
  const res2 = await login.poll(res.data.auth_code);
  console.log("res2", res2);
  fs.writeFileSync("cookie.json", res2);
}

// 获取登录用户信息
async function getMyInfo() {
  const client = new Client();
  await client.loadCookieFile("C:\\Users\\renmu\\biliAPI\\cookies.json");
  const res = await client.user.getMyInfo();
  console.log(res);
}

// 获取用户信息
async function getUserInfo() {
  const client = new Client();
  const res = await client.user.getUserInfo(10995238);
  console.log(res);
}

// 获取主播信息
async function getMasterInfo() {
  const client = new Client();
  const res = await client.live.getMasterInfo(10995238);
  console.log(res);
}
