# 介绍

支持 WebQrcode,TvQrcode 登录方式，支持视频的上传与编辑，并支持监听进度以及暂停取消等操作。

bilibili 接口的 node 包装库，快速迭代中，不保证接口稳定性，部分接口参数和返回值参考接口说明。
示例可参考 [example](https://github.com/renmu123/biliAPI/blob/master/example.js)
更新记录参考 [CHANGELOG](https://github.com/renmu123/biliAPI/blob/master/CHANGELOG.md)

## 安装

`npm install @renmu/bili-api`  
需要 node>=18

## 使用

```js
import { Client, TvQrcodeLogin } from "@renmu/bili-api";

const client = new Client();
const res = await client.live.getMasterInfo(3927637, false);
console.log(res);
```

## 衍生项目

- [biliLive-tools](https://github.com/renmu123/biliLive-tools) B 站录播一站式工具

# 接口

绝大部分接口都是 web api，只需要 cookie，目前只有上传稿件且使用`client`提交接口需要`accessToken`

## 基础类

```js
import { Client, TvQrcodeLogin } from "@renmu/bili-api";

// 默认无需登录的接口是不使用cookie，部分接口在登录与未登录态下返回参数不同，也在调用时单独传入是否使用cookie参数
const client = new Client(false);
// 加载cookie,cookie如何获取参考登录，目前仅支持tv平台扫码登录
await client.loadCookieFile("cookies.json");
// 也可以手动设置cookie和accessToken，cookie可在web抓包获取
client.setAuth(
  {
    bili_jct: "1111",
    SESSDATA: "111",
  },
  "1111"
);
```

## 工具类

```js
import { utils } from "@renmu/bili-api";
// 用于wbi接口签名, 返回的参数直接用于url拼接
const query = await utils.WbiSign({
  test: "111",
});
```

## 登录

### 扫码登录

```js
import { TvQrcodeLogin, WebQrcodeLogin } from "@renmu/bili-api";

// 也可以使用WebQrcodeLogin使用web端的扫码登录
const tv = new TvQrcodeLogin();
const url = await tv.login();
console.log(url);
// 找个二维码工具将 url 转换为二维码，使用bilibili app扫码登录

// 扫码完成会触发
tv.on("completed", res => {
  console.log("completed", res);
  // 如果是tv端，可以直接保存后调用loadCookieFile函数
  fs.writeFileSync("cookie.json", JSON.stringify(res.data));
  // 以下为web端扫码登录返回的参数，可以尝试使用setAuth进行登录
  //   {
  //   DedeUserID: '111',
  //   DedeUserID__ckMd5: '111',
  //   Expires: '1718116416',
  //   SESSDATA: '111',
  //   bili_jct: '1111',
  //   gourl: 'https://www.bilibili.com',
  //   refresh_token: '1111'
  // }
});

// 失败会触发比如超时
tv.on("error", res => {
  console.log("err", res);
});

// 扫描中会触发
tv.on("scan", res => {
  console.log("scan", res);
});

// 完成和失败后都会触发，返回原始参数
tv.on("end", res => {
  console.log("end", res);
});

// 可用于中断任务，并清除所有监听器
// tv.interrupt();
```

## 用户

### 获取当前用户信息

登录：必要  
`client.user.getMyInfo();`

### 通过 id 获取用户信息

`client.user.getUserInfo(uid)`

### 获取用户动态列表

`client.user.space(uid)`

### 获取用户投稿

`client.user.getVideos({mid: uid})`

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

使用`client`提交接口需要`accessToken`
分区可以通过 `client.common.getAreas()` 获取
api.submit 支持`"web" | "client" | "b-cut"` 三种参数，各有优劣

```js
const res = await client.platform.onUploadMedia(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
```

或者

```js
const task = await client.platform.addMedia(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
task.emitter.on("completed", res => {
  console.log("completed upload", res);
});
task.emitter.on("progress", res => {
  console.log("progress", res);
});

// 暂停任务
task.pause();
// 继续任务
task.start();
// 取消任务
task.cancel();
```

### 编辑投稿

使用`client`提交接口需要`accessToken`
分区可以通过 `client.common.getAreas()` 获取

```js
const client = new Client();
await client.loadCookieFile("cookies.json");
const task = await client.platform.editMedia(aid, ["test.mp4"], {}, mode);
// 其余功能参考新投稿
```

### 获取投稿详情

`bvid`和`aid`任选一个传入

```js
client.platorm.getArchive({
  bvid,
  aid,
});
```

### 获取投稿列表

`client.platorm.getArchives(...)`

### 检查标签可用性

`client.platorm.checkTag(text)`

### 上传图片

`client.platform.uploadCover(filePath)`

### 获取上传模板

`client.platform.getUploadTemplateList()`

### 编辑上传模板

`client.platform.editUploadTemplate(tid)`

### 获取推荐标签

`client.platform.getRecommendTags()`

### 获取话题

`client.platform.getTopic()`

## 话题搜索

`client.platform.searchTopic()`

## 合集列表

`client.platform.getSeasonList()`

## 合集内添加稿件

`client.platform.addSeasonMedia()`

## aid 反查合集 id

`client.platform.getSessionId()`

## 搜索

### 综合搜索

`client.search.all({keyword:"测试"})`

### 分类搜索

具体参数见类型文件

`client.search.type({keyword:"测试",search_type:"video"})`

## 通用

### 获取分区

`client.common.getAreas()`
