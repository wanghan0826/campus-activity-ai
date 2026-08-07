# AI 荔行——校园文化活动全流程智能体

面向学院师生、适配企业微信工作台的校园活动全流程原型。教师既可以用一句话让 AI 生成活动方案，也可以手动填写；生成后可继续编辑、保存草稿并提交审批。审批发布后，学生可以在活动广场查看详情、在线报名，并在报名中心管理自己的活动。

## 已实现功能

- AI 快速创建：解析活动大纲，生成标题、简介、时间、地点、流程、物料等结构化方案
- AI 活动封面：根据方案中的画面描述生成横版封面，可预览、重新生成或改用已有图片
- 多轮补充：信息不完整时继续输入，AI 重新整理方案
- 相对日期识别：按 `Asia/Shanghai` 当天时间自动换算“星期四”“本周日”“下周五”等表达，公文含明确日期时以明确日期为准
- 手动创建：保留传统表单入口
- 报名与认定：可选择“先到先得”或“需要审核”，并支持现场签到码/人工签到、第二课堂学分、志愿服务时长
- 学生视角预览：提交前检查学生端展示效果
- 学生活动广场：仅展示已完成两级审批并正式发布的活动，支持搜索、分类筛选和详情查看
- 在线报名：先到先得模式提交后立即成功；审核模式先进入待审核，审核通过后才占用正式名额
- 报名管理：发布人查看报名名单，通过或拒绝待审核申请；拒绝时须填写原因，学生可查看原因并重新申请
- 我的报名：按进行中、未通过、已取消和全部筛选报名记录，活动开始前可取消并重新报名
- 入场签到：发布人开启现场签到并显示动态六位签到码，学生在“我的报名”中签到，工作人员可人工补签或撤销误签
- 签到统计与导出：后台实时汇总报名、已到和缺席人数，可导出 Excel 可打开的 CSV 电子签到表，也可打印带现场签名栏的纸质签到表
- 手机端适配：学生端提供底部导航、单列活动卡片和移动端详情弹窗
- 账号密码登录：密码使用 BCrypt 加密，登录令牌只以摘要形式保存在后端，并支持退出和会话过期
- 角色权限：活动发布人、学院审核老师、学院领导、学生分别只能访问对应功能，后端拒绝越权请求
- 学校认证预留：用户表包含认证来源与学校侧唯一身份字段，后续可映射学校统一身份认证结果
- 活动管理：状态统计、搜索筛选、详情预览、继续编辑、复制和删除草稿
- 两级审批：发布人提交后依次流转至学院审核老师、学院领导，终审通过后由发布人确认上架
- 审批留痕：记录审批轮次、处理人、意见和时间；任一级驳回后可修改并重新提交
- 分院权限：审核人只能查看和处理本学院、当前节点的待办，重复或越级审批会被拒绝
- 权限占位：通过 `X-User-Id`、`X-User-Role`、`X-User-College` 模拟企业微信登录网关注入的身份

## 技术栈

- 前端：React 18、Vite 6、Tailwind CSS 4、Axios
- 后端：Java 17、Spring Boot 3.2、Spring Data JPA
- 数据库：MySQL 8（测试环境使用 H2）
- AI：DeepSeek Chat Completions API + 火山方舟 Seedream Image API

## 本地启动

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 启动后端

不要把 API Key 写进代码或提交到 GitHub，请使用环境变量：

```powershell
$env:AI_API_KEY="你的 DeepSeek API Key"
cd backend
mvn spring-boot:run
```

后端默认地址：`http://localhost:8080`

本地原型也可以启动后，在页面右上角打开“AI 设置”输入 DeepSeek API Key。通过页面输入的 Key 只保存在当前后端进程内存中，不写数据库、浏览器存储或项目文件，后端重启后会自动清除；状态接口只返回掩码，不返回明文。

封面生图使用独立配置，可直接在“AI 设置”中填写生图接口地址、模型和 API Key。默认使用火山方舟 Seedream 5.0 Pro（与即梦同源）；也可以通过环境变量配置：

```powershell
$env:AI_IMAGE_API_KEY="你的火山方舟 API Key"
$env:AI_IMAGE_API_URL="https://ark.cn-beijing.volces.com/api/v3/images/generations"
$env:AI_IMAGE_MODEL="doubao-seedream-5-0-260128"
```

生成的图片默认保存在后端运行目录的 `data/generated-covers`，该目录不会提交到 GitHub。生产环境建议替换为对象存储。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：`http://localhost:5173`

如需修改开发服务器代理的后端地址，可在 `frontend/.env.local` 中配置：

```env
VITE_API_PROXY_TARGET=http://localhost:8080
```

本地首次启动会建立四个测试账号：

| 账号 | 初始密码 | 权限 |
| --- | --- | --- |
| `publisher` | `publisher123` | 活动发布人 |
| `reviewer` | `reviewer123` | 学院审核老师 |
| `leader` | `leader123` | 学院领导 |
| `student` | `student123` | 学生 |

正式部署前请通过 `AUTH_*_PASSWORD` 环境变量修改初始密码；已有账号不会在重启时被覆盖。接入学校统一身份认证后，请设置 `AUTH_BOOTSTRAP_ENABLED=false` 关闭本地初始账号。

## Android 测试包

项目已使用 Capacitor 封装 Android 客户端。APK 内包含前端页面，审批、AI 解析和生图仍需连接本项目后端。

构建前先填写手机能够访问的后端地址（手机和电脑在同一网络时可使用电脑的局域网 IP）：

```powershell
cd frontend
$env:VITE_API_BASE_URL="http://电脑局域网IP:后端端口"
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

生成文件位于 `frontend/android/app/build/outputs/apk/debug/app-debug.apk`。正式部署时请把 `VITE_API_BASE_URL` 替换为 HTTPS 后端域名，并使用正式签名生成 release 包。

## 审批状态流转

`DRAFT/REJECTED → PENDING_APPROVAL（学院审核老师）→ PENDING_APPROVAL（学院领导）→ APPROVED → PUBLISHED`

任一审批节点驳回后状态变为 `REJECTED`；发布人修改并重新提交时，审批轮次加一，历史记录保留。

## 主要接口

- `POST /api/auth/login`：账号密码登录并签发会话令牌
- `GET /api/auth/me`：读取当前登录用户与角色
- `POST /api/auth/logout`：注销当前会话
- `POST /api/activities/parse`：AI 解析活动描述
- `GET /api/ai/settings`：查询 AI Key 是否已配置（只返回掩码）
- `PUT /api/ai/settings`：在当前后端进程内存中配置 API Key
- `DELETE /api/ai/settings`：清除内存中的 API Key
- `GET /api/ai/image-settings`：查询封面生图配置状态
- `PUT /api/ai/image-settings`：配置生图接口、模型和 API Key
- `DELETE /api/ai/image-settings`：清除内存中的生图 API Key
- `POST /api/ai/images/generate`：根据提示词生成并保存活动封面
- `GET /api/ai/images/{fileName}`：读取已生成的活动封面
- `POST /api/activities`：保存活动草稿
- `GET /api/activities`：分页查询个人活动
- `GET /api/activities/stats`：活动状态统计
- `GET /api/activities/{id}`：查看活动详情
- `PUT /api/activities/{id}`：更新活动草稿
- `POST /api/activities/{id}/submit`：提交审批
- `POST /api/activities/{id}/publish`：两级审批通过后确认发布
- `POST /api/activities/{id}/duplicate`：复制活动
- `DELETE /api/activities/{id}`：删除可编辑草稿
- `GET /api/approvals/tasks`：查询当前角色和学院的待办
- `GET /api/approvals/{activityId}/history`：查询审批轨迹
- `POST /api/approvals/{activityId}/approve`：通过当前审批节点
- `POST /api/approvals/{activityId}/reject`：驳回并填写原因
- `GET /api/student/activities`：学生查询已发布活动，支持关键词和分类筛选
- `GET /api/student/activities/{id}`：学生查看已发布活动详情和自己的报名状态
- `GET /api/student/registrations`：查询当前学生的全部报名记录
- `POST /api/student/activities/{id}/registrations`：报名活动
- `DELETE /api/student/activities/{id}/registrations`：取消报名
- `GET /api/activities/{id}/registrations`：发布人查看报名名单、状态和剩余名额
- `POST /api/activities/{id}/registrations/{registrationId}/approve`：通过待审核报名
- `POST /api/activities/{id}/registrations/{registrationId}/reject`：拒绝报名并填写学生可见原因
- `POST /api/student/activities/{id}/check-in`：学生输入现场签到码完成签到
- `GET /api/activities/{id}/check-in`：发布人查看活动签到名单与统计
- `POST /api/activities/{id}/check-in/open`：开启现场签到并生成动态签到码
- `POST /api/activities/{id}/check-in/close`：关闭现场签到
- `POST /api/activities/{id}/check-in/registrations/{registrationId}`：工作人员人工补签
- `DELETE /api/activities/{id}/check-in/registrations/{registrationId}`：撤销误签
- `GET /api/activities/{id}/check-in/export`：导出 UTF-8 CSV 电子签到表

学生报名及签到数据保存在 `activity_registration` 表中，活动与学生组合具有唯一约束，避免重复报名；取消后重新报名会复用原记录并更新状态。签到记录包含签到时间、方式和操作人，便于后续核对。

用户信息保存在 `app_user` 表中，登录会话保存在 `user_session` 表中。业务接口不再信任前端传入的用户编号或角色，而是统一从服务端验证后的登录会话读取身份。

## 学校统一身份认证接入

后续接入学校认证时，将学校返回的稳定用户标识写入 `app_user.external_subject`，并把 `auth_source` 设置为 `SCHOOL_SSO`。认证回调只需要完成“学校身份 → 本地用户”的查找或创建，之后继续签发当前系统的会话令牌；活动、审批和报名接口无需改造。

## 测试与构建

```bash
cd backend
mvn test

cd ../frontend
npm run build
```

当前版本用于课程项目原型。正式部署到企业微信前，还需接入企业微信 OAuth、从组织通讯录映射学院与角色，并完善文件存储和生产级消息通知。
