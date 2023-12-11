# 介绍

bilibili 接口的 node 包装库，快速迭代中，不保证接口稳定性，具体文档之后会补。  
部分示例可参考[example](https://github.com/renmu123/biliAPI/blob/master/example.js)

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

// 可用于中断任务，并清除所有监听器
// tv.interrupt();
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

使用`client`提交接口需要`accessToken`

```js
const client = new Client();
await client.loadCookieFile("cookies.json");
const res = await client.platform.uploadMedia(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
```

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

## 搜索

### 综合搜索

`client.search.all({keyword:"测试"})`

### 分类搜索

具体参数见类型文件

`client.search.type({keyword:"测试",search_type:"video"})`
