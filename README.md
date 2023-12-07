# 介绍

bili 的 node 包装库

# 登录

## 扫码登录

```js
const login = new BiliQrcodeLogin();
const res = await login.getQrcode();

console.log("res", res);
// 找个二维码工具将 res.data.url 转换为二维码，使用bilibili app扫码登录

const res2 = await login.poll(res.data.auth_code);
console.log("res2", res2);
```

# 投稿中心

## 上传视频

```js
const client = new Client();
await client.loadCookieFile("cookies.json");
const res = await client.platform.uploadMedia(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
```

# 用户

## 获取当前用户信息

`client.user.getMyInfo();`

## 获取其他用户信息

`client.user.getUserInfo(uid)`

# 直播

## 获取房间信息

`client.live.getRoomInfo(room_id)`

## 获取某主播信息

`client.live.getMasterInfo(uid)`

## 获取舰长信息

`client.live.getGuardTopList({user_id:1,room_id:1,page:1,page_size:20})`

# 创作中心

## 添加投稿

`client.platorm.uploadMedia(...)`

## 编辑投稿

`client.platorm.editMedia(...)`

## 获取投稿详情

`client.platorm.getMediaDetail(aid)`

## 获取投稿列表

`client.platorm.getArchives(...)`

## 检查标签可用性

`client.platorm.checkTag(text)`
