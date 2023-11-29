import md5 from "md5";
import axios from "axios";

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

// 对 imgKey 和 subKey 进行字符顺序打乱编码
function getMixinKey(orig: any) {
  let temp = "";
  mixinKeyEncTab.forEach(n => {
    temp += orig[n];
  });
  return temp.slice(0, 32);
}

// 为请求参数进行 wbi 签名
export function encWbi(params: any, img_key: any, sub_key: any) {
  const mixin_key = getMixinKey(img_key + sub_key),
    curr_time = Math.round(Date.now() / 1000),
    chr_filter = /[!'()*]/g;
  let query: any = [];
  Object.assign(params, { wts: curr_time }); // 添加 wts 字段
  // 按照 key 重排参数
  Object.keys(params)
    .sort()
    .forEach(key => {
      query.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(
          // 过滤 value 中的 "!'()*" 字符
          params[key].toString().replace(chr_filter, "")
        )}`
      );
    });
  query = query.join("&");
  const wbi_sign = md5(query + mixin_key); // 计算 w_rid
  return query + "&w_rid=" + wbi_sign;
}

// 获取最新的 img_key 和 sub_key
export async function getWbiKeys() {
  const resp = await axios({
      url: "https://api.bilibili.com/x/web-interface/nav",
      method: "get",
      responseType: "json",
    }),
    json_content = resp.data,
    img_url = json_content.data.wbi_img.img_url,
    sub_url = json_content.data.wbi_img.sub_url;

  return {
    img_key: img_url.slice(
      img_url.lastIndexOf("/") + 1,
      img_url.lastIndexOf(".")
    ),
    sub_key: sub_url.slice(
      sub_url.lastIndexOf("/") + 1,
      sub_url.lastIndexOf(".")
    ),
  };
}

// 签名
export async function WbiSign(params: any) {
  const wbi_keys = await getWbiKeys();
  return encWbi(params, wbi_keys.img_key, wbi_keys.sub_key);
}

// getWbiKeys().then(wbi_keys => {
//   const query = encWbi(
//     {
//       foo: "114",
//       bar: "514",
//       baz: 1919810,
//     },
//     wbi_keys.img_key,
//     wbi_keys.sub_key
//   );
//   console.log(query);
// });
