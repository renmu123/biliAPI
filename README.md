# 介绍

bilibili 接口的 node 包装库，快速迭代中，不保证接口稳定性，部分接口参数和返回值参考接口说明。

支持 WebQrcode,TvQrcode 登录方式，完整支持视频的上传与下载功能，并支持监听进度以及暂停取消等操作。

示例可参考 [example](https://github.com/renmu123/biliAPI/blob/master/example.js)
更新记录参考 [CHANGELOG](https://github.com/renmu123/biliAPI/blob/master/CHANGELOG.md)

## 安装

`npm install @renmu/bili-api`  
需要 node>=18

## 使用

### 无需登录的接口

```js
import { Client } from "@renmu/bili-api";

const client = new Client();
const data = await client.live.getMasterInfo(3927637, false);
console.log(data);
```

### 需要登录的接口

如何登录参考下面的登录文档

```js
import { Client } from "@renmu/bili-api";

// 获取登录用户信息
async function getMyInfo() {
  const client = new Client();
  await client.loadCookieFile("cookies.json");
  const data = await client.user.getMyInfo();
  console.log(data);
}
```

你也可用单独导出对应类

```js
import { User } from "@renmu/bili-api";

const getMyInfo2 = async () => {
  const auth = new Auth();
  await auth.loadCookieFile("cookies.json");
  const user = new User(auth);
  const res = await user.getMyInfo();
  console.log(res);
};
```

## 衍生项目

- [biliLive-tools](https://github.com/renmu123/biliLive-tools) B 站录播一站式工具
- [bili-cli](https://github.com/renmu123/bili-cli) b 站命令行工具

# 接口

绝大部分接口都是 web api，只需要 cookie，目前只有上传稿件且使用`client`提交接口需要`accessToken`

## 基础类

```js
import {
  Client,
  TvQrcodeLogin,
  WebVideoUploader,
  Common,
  Reply,
  Video,
  User,
  Platform,
  Search,
  Live,
  Auth,
} from "@renmu/bili-api";

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

## 工具类

```js
import { utils } from "@renmu/bili-api";
// fakeBuvid3, // 生成模拟buivd3
// fakeDmCoverImgStr, // 生成模拟dmcoverimgstr
// protobufDecode,  // prorobuf弹幕解析为json
// protoBufToXml,  // prorobuf弹幕解析为兼容xml
// 用于wbi接口签名, 返回的参数直接用于url拼接
const query = await utils.WbiSign({
  test: "111",
});
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

### 单独上传分 p

如果你想动态添加分 p，可以尝试使用`WebVideoUploader`来单独处理视频的上传，并调用`addMediaClientApi`,`addMediaWebApi`,`addMediaBCutApi`来进行提交。或调用`editMediaClientApi`,`editMediaWebApi`来进行编辑

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

## 视频详情

视频详情页相关的接口，可以通过以下两种方式创建实例。
如果设置了 aid，那么以下所有接口的 aid 都可以无需再传，你也可以传递 aid 进行覆盖。

```js
const video = client.video;
// const video = client.newVideo(aid)
//
// video.setAid(aid);
video.like({
  like: true,
});
```

### 获取视频信息

`video.getInfo()`

### 获取视频播放信息

`video.playurl()`

### 下载

下载需要传递`ffmpeg`地址，用于合并视频与音频，如果不传，默认使用环境变量。
如果你在 electron 中使用，可能需要修复[path](https://github.com/sindresorhus/fix-path)

```js
const download = async () => {
  const client = new Client();
  await client.loadCookieFile("cookies.json");
  const task = await client.video.download({
    bvid: "BV1wc41127vK",
    output: "test.mp4",
  });
  setTimeout(() => {
    task.pause();
  }, 3000);
  setTimeout(() => {
    task.start();
  }, 5000);

  task.on("progress", p => {
    console.log(p);
    // p.event = "download"|"merge-start"|"merge-end"
    // 只有`p.event`=`download`才有`progress`相关参数，注意判断
    // if (p.event === "download") {
    //   const percentage = Math.floor(p.progress.progress * 100);
    // }
  });
  // console.log(res);
};
```

### 设置 aid

`video.setAid(aid)`

### 点赞

`video.like`

### 投币

`video.coin()`

### 列出收藏夹

`video.listFavoriteBox()`

### 处理收藏夹内容

`video.editFavoriteBox()`

### 增加分享次数

`video.addShare()`

### 一键三连

`video.likeCoinShare()`

### 评论

`const reply = client.video.createReply(rpid)`

其他可用接口见评论接口

## 评论

```js
const reply = client.reply;
// 这样设置后不用每次传递oid与type
// const reply = client.newReply(oid,type)
// reply.setOid(oid);
// reply.setType(type);
```

### 列表

`reply.list()`

### 个数

`reply.count()`

### 添加

`reply.add()`

### 点赞

`reply.like()`

### 点踩

`reply.hate()`

### 删除

`reply.delete()`

### 置顶

`reply.top()`

### 举报

`reply.report()`

## 通用

### 获取分区

`client.common.getAreas()`
