# 介绍

bili 的 node 包装库

# 登录

## 扫码登录

```js
const login = new BiliQrcodeLogin();
const res = await login.getQrcode();

console.log("res", res.data);
// 找个二维码工具将 res.data.url 转换为二维码，使用bilibili app扫码登录

const res2 = await login.poll(res.data.data.auth_code);
console.log("res2", res2.data);
```

## 上传视频

```js
const client = new Client();
await client.loadCookieFile("cookies.json");
const res = await client.addMediaClient(["test.mp4"], {
  title: "测试",
  tid: 138,
  tag: "测试",
});
```
