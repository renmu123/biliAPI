# 介绍

bili 的 node 包装库

# 登录

## 扫码登录

```js
const res = await client.generate_qrcode();
console.log(res.data.data.url);
// 找个二维码工具将url转换为二维码，使用bilibili app扫码登录
const qrcode_key = res.data.data.qrcode_key;
const timer = setInterval(async () => {
  const res = await client.poll_qrcode(qrcode_key);
  if (res.data.data.code == 0) {
    console.log(res.data.data.url, res.headers["set-cookie"]);
    const cookie = "; ".join(res.headers["set-cookie"]);
    console.log(cookie);
    clearInterval(timer);
  }
}, 3000);
```
