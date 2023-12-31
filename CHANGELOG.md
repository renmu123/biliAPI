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
