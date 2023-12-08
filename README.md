# 介绍

bilibili 接口的 node 包装库，快速迭代中，不保证接口稳定性，具体文档之后会补。  
部分示例可参考[example](./example.js)

## 安装

`npm install @renmu/bili-api`

## 使用

```js
import { Client, TvQrcodeLogin } from "@renmu/bili-api";

const client = new Client();
// 加载cookie,cookie如何获取参考登录，目前仅支持tv平台扫码登录
await client.loadCookieFile("cookies.json");
```

## 衍生项目

- [biliLive-tools](https://github.com/renmu123/biliLive-tools) B 站录播一站式工具

# 接口

## 登录

### 扫码登录

```js
const tv = new TvQrcodeLogin();
const url = await tv.login();
console.log(url);
// 找个二维码工具将 url 转换为二维码，使用bilibili app扫码登录

// 扫码完成会触发
tv.on("completed", res => {
  console.log("completed", res);
  fs.writeFileSync("cookie.json", JSON.stringify(res.data));
});

// 失败会触发比如超时
tv.on("error", res => {
  console.log("err", res);
});

// 扫描中会触发
tv.on("scan", res => {
  console.log("scan", res);
});

// 完成和失败后都会触发
tv.on("end", res => {
  console.log("end", res);
});
```

## 用户

### 获取当前用户信息

登录：必要  
`client.user.getMyInfo();`

### 获取其他用户信息

`client.user.getUserInfo(uid)`

## 直播

### 获取房间信息

`client.live.getRoomInfo(room_id)`

### 获取某主播信息

`client.live.getMasterInfo(uid)`

### 获取舰长信息

`client.live.getGuardTopList({user_id:1,room_id:1,page:1,page_size:20})`

## 创作中心

登录：必要

### 添加投稿

```js
const client = new Client();
await client.loadCookieFile("cookies.json");
const res = await client.platform.uploadMedia(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
```

### 编辑投稿

`client.platorm.editMedia(...)`

### 获取投稿详情

`client.platorm.getMediaDetail(aid)`

### 获取投稿列表

`client.platorm.getArchives(...)`

### 检查标签可用性

`client.platorm.checkTag(text)`

### 上传图片

`client.platform.uploadCover(filePath)`

### 获取上传模板

`client.platform.getUploadTemplateList()`
