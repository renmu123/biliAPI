# 1.1.0

## Feature

1. `video.download`函数不传递`ffmpegBinPath`的情况下使用`web`模式，最高支持 720p，且 mediaOptions 参数除 qn 外不会生效
2. 增加获取弹幕接口
3. 优化评论接口

## Bug Fix

1. 修复下载进度条可能出现无穷大的 bug
2. 修复`common.getAreas`失效的 bug

## Feature

1. proto 弹幕获取及转换为 xml 支持

# 1.0.0

## Breaking change

1. `Client`类初始化参数变更
2. 返回参数修改，直接返回 data
3. "axios", "p-queue", "axios-retry" 现在不会被打包进去

## Feature

1. 新增子类导出 `Common,Reply,Video,User,Search,Platform,Live`
2. 增加下载视频相关接口

## Bug fix

1. 修复投稿列表查询失败
2. 修复动态查询失败
3. 修复投稿编辑时 descv2 未对应导致的 bug

## Other

1. 重构`useCookie`的实现

# 0.7.2

## Bug fix

1. 修复上传和编辑视频取消后仍触发 completed 仍执行的 bug。
2. 修复编辑稿件 mode="append"且视频参数为空时无法编辑的 bug

## feature

1. 为上传和编辑视频时的 filePaths 增加验证。

# 0.7.1

1. 更新 axios 依赖

# 0.7.0

## Feature

1. 为切片上传失败时增加重试次数，默认重试 2 次
2. WebVideoUploader 增加并行参数，默认为 3
3. 增加视频详情及评论相关的接口，具体见文档
4. 增加评论相关接口，详情见文档
5. `client.setAuth`增加 uid 参数，部分需要传递当前用户 uid 参数的接口无需传递

## Bug ifx

## Other

1. 开发 node 版本更新为 20 版本

# 0.6.2

## Breaking

## Feature

1. 增加合集列表，合集内添加稿件，aid 反查合集 id 接口

## Bug Fix

1. 修复取消上传稿件时仍进行视频合并的 bug

# 0.6.1

## Breaking

## Feature

1. 增加话题搜索接口
2. 优化接口的 types
3. 增加稿件编辑的客户端接口支持

## Bug Fix

1. 修复编辑稿件的相关 bug
2. 修复上传视频视频错误未触发 error 事件的 bug

## Other

1. 依赖更新

# 0.6.0

## Breaking

1. 获取投稿详情接口函数名从`getMediaDetail`修改为`getArchive`
2. `getArchive` 参数修改，支持 bvid
3. 上传接口修改`onAddMedia`

## Feature

1. 增加 WebQrcodeLogin 登录参数
2. 增加分区查询接口
3. 重构 types 导出
4. 增加编辑投稿接口
5. 增加 `addMedia` 方法
6. 增加 `editMedia` 和 `onEditMedia` 方法
7. 上传和编辑投稿接口支持`pause`,`start`,`cancel`三种控制方法
8. 上传提交新增 `b-cut`，利用必剪进行上传
9. 增加 `getRecommendTags` 和 `getTopic` 和 `editUploadTemplate`

## Bug fix

1. 修复 getMyInfo 返回类型错误的 bug
2. 一些无需登录接口中的 buvid3 改为随机值

# 0.5.0

**node > 18**

1. 移除无用依赖
2. 修复 wbi 签名错误
3. 增加 wbi 签名导出
4. 修复上传稿件使用 web api 错误
5. 部分接口增加登录校验
6. 优化文档
7. node > 18
8. 增加综合搜索、分类搜索、用户动态、用户投稿接口

# 0.4.1

1. 登录接口增加中断功能

# 0.4.0

1. 增加上传封面，模板列表接口
2. 优化登录接口 api

# 0.3.0

优化上传视频接口

# 0.2.0

增加多个接口，完善类型定义
