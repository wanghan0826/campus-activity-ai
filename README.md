# AI 荔行——校园文化活动全流程智能体

面向学院师生、适配企业微信工作台的校园活动全流程原型。教师既可以用一句话让 AI 生成活动方案，也可以手动填写；生成后可继续编辑、保存草稿并提交审批。审批发布后，学生可以在活动广场查看详情、在线报名，并在报名中心管理自己的活动。

## 已实现功能

- AI 快速创建：解析活动大纲，生成标题、简介、时间、地点、流程、物料等结构化方案
- AI 活动封面：根据方案中的画面描述生成横版封面，可预览、重新生成或改用已有图片
- 多轮补充：信息不完整时继续输入，AI 重新整理方案
- 相对日期识别：按 `Asia/Shanghai` 当天时间自动换算“星期四”“本周日”“下周五”等表达，公文含明确日期时以明确日期为准
- 手动创建：保留传统表单入口
- 报名与认定：可选择“先到先得”或“需要审核”，并支持现场签到码、雷达定位签到、人工签到、第二课堂学分、志愿服务时长
- 学生视角预览：提交前检查学生端展示效果
- 学生活动广场：仅展示已完成两级审批并正式发布的活动，支持搜索、分类筛选和详情查看
- 在线报名：先到先得模式提交后立即成功；审核模式先进入待审核，审核通过后才占用正式名额
- 报名管理：发布人查看报名名单，通过或拒绝待审核申请；拒绝时须填写原因，学生可查看原因并重新申请
- 我的报名：按进行中、未通过、已取消和全部筛选报名记录，活动开始前可取消并重新报名
- 入场签到：支持动态六位签到码和雷达定位两种学生自助签到方式；雷达签到由发布人在现场设置签到点与有效半径，只保存学生与签到点的距离和定位精度，工作人员仍可人工补签或撤销误签
- 签到统计与导出：后台实时汇总报名、已到和缺席人数，可导出 Excel 可打开的 CSV 电子签到表，也可打印带现场签名栏的纸质签到表
- 手机端适配：学生端提供底部导航、单列活动卡片和移动端详情弹窗
- 账号密码登录：密码使用 BCrypt 加密，登录令牌只以摘要形式保存在后端，并支持退出和会话过期
- 角色权限：活动发布人、学院审核老师、学院领导、学生分别只能访问对应功能，后端拒绝越权请求
- 学校认证预留：用户表包含认证来源与学校侧唯一身份字段，后续可映射学校统一身份认证结果
- 活动管理：状态统计、搜索筛选、详情预览、继续编辑、复制和删除草稿
- 学院协作视图：发布人可切换查看本学院教师创建的活动，创建人信息清晰可见；编辑、删除、发布等操作仍只属于原创建人
- 两级审批：发布人提交后依次流转至学院审核老师、学院领导，终审通过后由发布人确认上架
- 群聊通知范围：创建活动时可多选已接入的企微信群，草稿和审批阶段保持静默，正式发布后由群机器人自动发送活动信息与报名入口
- 审批留痕：记录审批轮次、处理人、意见和时间；任一级驳回后可修改并重新提交
- 分院权限：审核人只能查看和处理本学院、当前节点的待办，重复或越级审批会被拒绝
- 公文链接导入：在学校域名白名单内抓取公文网页正文，交给现有 AI 和相对日期解析生成活动草稿；默认关闭，配置完成后入口自动显示
- 企业微信登录预留：已实现可选 OAuth 登录流程和本地账号映射，未配置时登录页保持原样
- 运行基础：提供数据库健康检查，并自动记录已登录用户对业务接口的新增、修改、审批等操作

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

如果只想本地体验、不想安装或配置 MySQL，可使用内置的文件型演示数据库：

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=local-demo"
```

演示数据保存在 `backend/data/campus_local.mv.db`，重启后仍会保留；该目录不会提交到 GitHub。线上仍使用默认 MySQL 配置。

AI Key 只配置在后端服务器环境变量中，不会下发到浏览器，也不在网页上提供查看或修改入口。配置完成后，所有已登录账号都可以调用文字解析和封面生图；活动保存、提交与发布仍按角色权限控制。这样无论谁打开网站，都使用服务器统一提供的 AI 能力，同时避免泄露 Key。

封面生图使用独立配置，默认使用火山方舟 Seedream 5.0 Pro（与即梦同源）：

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
| `publisher` | `123456` | 活动发布人 |
| `publisher2` | `123456` | 同学院第二位活动发布人（协作视图测试） |
| `reviewer` | `123456` | 学院审核老师 |
| `leader` | `123456` | 学院领导 |
| `student` | `123456` | 学生 |

正式部署前请通过 `AUTH_*_PASSWORD` 环境变量修改初始密码；已有账号不会在重启时被覆盖。接入学校统一身份认证后，请设置 `AUTH_BOOTSTRAP_ENABLED=false` 关闭本地初始账号。

### 4. 可选接入学校公文链接

只有明确列入白名单的域名才允许抓取，默认拒绝 HTTP、本机地址和内网地址：

```powershell
$env:DOCUMENT_IMPORT_ENABLED="true"
$env:DOCUMENT_IMPORT_ALLOWED_HOSTS="gongwen.example.edu,notice.example.edu"
```

如果公文通只在学校内网开放，应在校内服务器上运行后端，并根据实际网络设置 `DOCUMENT_IMPORT_ALLOW_PRIVATE_ADDRESSES=true`；不要在公网服务器上放开任意内网抓取。

### 5. 可选启用企业微信登录

```powershell
$env:WECOM_OAUTH_ENABLED="true"
$env:WECOM_CORP_ID="企业ID"
$env:WECOM_AGENT_ID="应用AgentID"
$env:WECOM_SECRET="应用Secret"
$env:WECOM_NOTIFICATION_ENABLED="true"
$env:WECOM_USER_BINDINGS="test_teacher_001=企微UserId,student_001=企微UserId"
$env:WECOM_OAUTH_REDIRECT_URI="https://你的可信域名/"
```

企业微信返回的 `UserId` 需要预先写入 `app_user.external_subject`，同时将该用户的 `auth_source` 设为 `WECOM`。系统不会根据首次登录自动授予角色，避免越权。

应用消息会进入企业微信消息中心。活动发布、审批状态变化、报名申请提交及报名审核结果都会通知对应人员；接收人优先读取 `app_user.wecom_user_id`，测试阶段也可以用 `WECOM_USER_BINDINGS` 临时绑定。没有绑定的用户会跳过通知，系统不会用 `@all` 兜底，避免误发全员。

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

## 企微信群通知

企微自建应用不能直接枚举并向任意已有群聊发消息，因此系统使用群机器人作为稳定的发送通道。首次接入某个群聊时，在企微群设置中添加群机器人并复制 Webhook 地址，然后在活动编辑页的“发布通知”中选择“接入新的群聊”。Webhook 仅保存在后端数据库，接口和活动详情都不会返回明文。

群聊只需接入一次。之后发布人创建活动时直接多选通知范围；两级审批过程中不会发送，发布人确认上架后才会异步通知所选群聊。单个群发送失败不会阻断活动发布，后台会保存发送结果。

## 主要接口

- `POST /api/auth/login`：账号密码登录并签发会话令牌
- `GET /api/auth/me`：读取当前登录用户与角色
- `POST /api/auth/logout`：注销当前会话
- `GET /api/auth/wecom/config`：查询企业微信登录是否可用
- `POST /api/auth/wecom/authorize`：生成带一次性校验参数的企业微信授权地址
- `POST /api/auth/wecom/callback`：校验企业微信身份并签发本系统会话
- `POST /api/activities/parse`：AI 解析活动描述
- `GET /api/activities/import-link/config`：查询公文链接导入是否可用
- `POST /api/activities/import-link`：读取白名单内公文页面并生成活动方案
- `GET /api/ai/settings`：查询 AI Key 是否已配置（只返回掩码）
- `PUT /api/ai/settings`：在当前后端进程内存中配置 API Key
- `DELETE /api/ai/settings`：清除内存中的 API Key
- `GET /api/ai/image-settings`：查询封面生图配置状态
- `PUT /api/ai/image-settings`：配置生图接口、模型和 API Key
- `DELETE /api/ai/image-settings`：清除内存中的生图 API Key
- `POST /api/ai/images/generate`：根据提示词生成并保存活动封面
- `GET /api/ai/images/{fileName}`：读取已生成的活动封面
- `POST /api/activities`：保存活动草稿
- `GET /api/activities`：分页查询个人活动；`scope=COLLEGE` 时查询本学院发布人活动
- `GET /api/activities/stats`：活动状态统计
- `GET /api/activities/{id}`：查看活动详情
- `PUT /api/activities/{id}`：更新活动草稿
- `POST /api/activities/{id}/submit`：提交审批
- `POST /api/activities/{id}/publish`：两级审批通过后确认发布
- `POST /api/activities/{id}/notifications/retry`：群聊通知部分失败或全部失败后重新发送
- `GET /api/notification-groups`：读取可选企微群通知范围
- `POST /api/notification-groups`：接入企微群机器人通知范围
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
- `POST /api/student/activities/{id}/check-in`：学生提交现场签到码，或提交一次性定位信息完成雷达签到
- `GET /api/activities/{id}/check-in`：发布人查看活动签到名单与统计
- `POST /api/activities/{id}/check-in/open`：开启现场签到；签到码模式生成动态签到码，定位模式保存现场中心点与有效半径
- `POST /api/activities/{id}/check-in/close`：关闭现场签到
- `POST /api/activities/{id}/check-in/registrations/{registrationId}`：工作人员人工补签
- `DELETE /api/activities/{id}/check-in/registrations/{registrationId}`：撤销误签
- `GET /api/activities/{id}/check-in/export`：导出 UTF-8 CSV 电子签到表
- `GET /api/system/health`：数据库及应用健康检查
- `GET /api/audit-logs`：学院审核老师或领导查看本学院操作留痕

学生报名及签到数据保存在 `activity_registration` 表中，活动与学生组合具有唯一约束，避免重复报名；取消后重新报名会复用原记录并更新状态。签到记录包含签到时间、方式和操作人，便于后续核对。

用户信息保存在 `app_user` 表中，登录会话保存在 `user_session` 表中。业务接口不再信任前端传入的用户编号或角色，而是统一从服务端验证后的登录会话读取身份。

## 学校统一身份认证接入

企业微信 OAuth 已使用同一套外部身份映射机制。后续接入学校认证时，将学校返回的稳定用户标识写入 `app_user.external_subject`，并把 `auth_source` 设置为 `SCHOOL_SSO`。认证回调只需要完成“学校身份 → 本地用户”的查找，之后继续签发当前系统的会话令牌；活动、审批和报名接口无需改造。角色仍由本系统预先配置，不根据外部返回值自动提权。

## 测试方案

### 1. 测试环境与账号

- 线上测试地址：`http://43.136.94.83/`
- 本地前端：`http://localhost:5173/`
- 本地后端：`http://localhost:8080/`
- 测试数据库：自动化测试使用 H2，线上流程使用 MySQL 持久化数据

| 账号 | 密码 | 测试角色 |
| --- | --- | --- |
| `publisher` | `123456` | 活动发布人 |
| `publisher2` | `123456` | 同学院第二位活动发布人 |
| `reviewer` | `123456` | 学院审核老师 |
| `leader` | `123456` | 学院领导 |
| `student` | `123456` | 学生 |

每轮人工测试使用带日期时间的唯一活动标题，例如“全流程验收活动-20260814-01”，避免与历史数据混淆。企微通知测试必须使用专门的测试群机器人，禁止向正式工作群发送测试消息。

### 2. 自动化测试与构建

```bash
cd backend
mvn test

cd ../frontend
npm run build
```

后端自动化测试覆盖：登录与会话、活动草稿与两级审批、学院协作边界、公文链接提取与白名单、相对日期换算、报名两种模式、无需报名活动展示、签到码与雷达定位签到、人数限制、AI/生图服务器配置与访问权限、企微群范围校验及通知重试。当前基线为 34 项测试全部通过，前端生产构建无错误。

### 3. 四角色主流程验收

1. 使用 `publisher` 登录，通过 AI 输入或手动表单创建活动；填写“下周五”等相对日期，保存草稿。
2. 设置报名方式、人数上限、签到方式、认定方式和通知范围，确认退出后重新进入草稿数据仍存在。
3. 发布人提交审批，检查活动进入“待学院审核老师”状态；草稿和审批阶段不得出现在学生端，也不得发送群聊通知。
4. 使用 `reviewer` 登录并通过，检查活动流转到“待学院领导”；审核老师不能越级完成终审。
5. 使用 `leader` 登录并通过，检查活动状态变为“已通过”；发布人确认发布后，活动进入“已发布”。
6. 使用 `student` 登录，在活动广场找到活动并查看详情；活动标题、时间、地点、封面和报名规则应与发布内容一致。
7. 返回发布人端，检查审批轨迹包含提交、审核老师通过和学院领导通过的处理人、意见及时间。

### 4. 驳回与重新提交

1. 发布人提交一条新活动，审核老师填写原因并驳回。
2. 发布人应能看到驳回原因，修改活动后重新提交。
3. 审批轮次应增加，旧审批记录保留，新一轮仍从审核老师开始。
4. 学院领导在活动尚未流转到自己节点时尝试审批，后端应拒绝越级操作。

### 5. 学生报名验收

| 场景 | 操作 | 预期结果 |
| --- | --- | --- |
| 先到先得 | 学生点击报名 | 立即报名成功并占用名额 |
| 需要审核 | 学生提交报名 | 状态为待审核，发布人通过后才成为正式名额 |
| 拒绝报名 | 发布人填写原因并拒绝 | 学生可看到原因并可重新申请 |
| 取消报名 | 活动开始前学生取消 | 名额释放，“我的报名”显示已取消 |
| 人数已满 | 超过活动人数上限继续报名 | 系统拒绝报名，不出现超额人数 |
| 重复报名 | 同一学生重复提交 | 不生成重复记录 |

发布人进入“报名管理”时应能看到报名学生、申请时间、审核状态、剩余名额和审核意见。“活动管理”可切换到“本学院”查看同事创建的活动，但报名管理、编辑、删除、提交和发布仍只允许原创建人操作；所有仍在展示期内的已发布活动都会显示在活动广场，无需报名的活动应明确标注“无需报名”且不显示报名按钮。

### 6. 入场签到与导出

1. 签到码活动：发布人对已发布活动开启签到，系统生成动态六位签到码；已报名成功的学生输入正确签到码后应记录签到时间。
2. 雷达定位活动：发布人在活动现场选择 50～500 米签到半径并开启签到，教师端应显示现场雷达、到场人数和定位精度。
3. 学生在 HTTPS 地址下允许一次定位；位于有效半径内时签到成功并显示距签到点距离，超出范围或定位精度过差时系统应拒绝签到。
4. 未报名、报名待审核、签到已关闭或签到码错误时，系统应拒绝签到。
5. 发布人执行人工补签和撤销误签，统计数字应即时更新；雷达签到开启期间名单每 5 秒自动刷新。
6. 导出 CSV 后使用 Excel/WPS 打开，检查中文、学号、姓名、报名状态、签到时间、签到方式、签到距离和定位精度无乱码。
7. 打印纸质签到表，检查活动信息、名单、现场签名栏及分页布局。

> 浏览器定位仅在 HTTPS 或本机 `localhost` 安全上下文中可用。通过服务器 IP 的普通 HTTP 地址打开平台时，雷达签到会提示改用 HTTPS 域名。

### 7. 企微群通知验收

1. 在专用测试群添加群机器人，将完整 Webhook 接入“发布通知”范围。
2. 创建活动时搜索并勾选一个或多个群，保存草稿后重新进入，选择结果应保留。
3. 审批前、审核老师通过后、学院领导通过但尚未正式发布时，群内均不应收到消息。
4. 发布人正式发布后，每个已选群只收到一条活动通知，内容包含标题、时间、地点和报名入口。
5. Webhook 无效、群被停用或网络超时时，活动仍应正常发布；后台显示失败群及原因，并允许“重试通知”。
6. 已发送成功的通知不得重复重试，接口和活动详情不得返回 Webhook 明文。

### 8. 权限、持久化与兼容性

- 四种角色分别尝试访问其他角色接口，未授权请求应返回 `401/403`，前端不显示越权入口。
- 刷新页面、退出重新登录以及后端重启后，活动、审批、报名和签到记录仍应存在。
- 在桌面浏览器和手机窄屏分别检查登录页、活动表单、审批列表、学生广场、报名管理和签到页面，页面不得横向溢出，主要按钮应可点击。
- 使用服务器 IP 测试前后端连通；正式域名启用后，再补测 HTTPS、企微可信域名和 OAuth 回调。
- API Key、数据库密码、企微 Secret 和 Webhook 不得出现在前端源码、浏览器存储、接口响应、Git 提交或截图中。

### 9. 发布验收标准

- 后端全部自动化测试通过，前端生产构建成功。
- 四角色主流程、驳回重提、两种报名模式、签到和导出均通过。
- 数据重启后不丢失，权限边界有效，浏览器控制台无阻断性错误。
- 涉及真实群消息、生产域名或学校身份数据的测试，必须使用明确授权的测试环境。

当前版本用于课程项目原型。企业微信 OAuth 和公文链接导入代码已在本地完成，但启用前仍需学校提供真实配置与账号映射；正式使用还需完成 HTTPS、组织通讯录同步、文件存储和生产级运行监控。

更完整的完成情况、线上状态和后续安排见 [`docs/CURRENT_PROGRESS.md`](docs/CURRENT_PROGRESS.md)。
