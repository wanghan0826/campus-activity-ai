# AI 荔行——校园文化活动全流程智能体

面向学院师生、适配企业微信工作台的校园活动创建与管理原型。教师既可以用一句话让 AI 生成活动方案，也可以手动填写；生成后可继续编辑、预览学生视角、保存草稿并提交审批。

## 已实现功能

- AI 快速创建：解析活动大纲，生成标题、简介、时间、地点、流程、物料等结构化方案
- AI 活动封面：根据方案中的画面描述生成横版封面，可预览、重新生成或改用已有图片
- 多轮补充：信息不完整时继续输入，AI 重新整理方案
- 相对日期识别：按 `Asia/Shanghai` 当天时间自动换算“星期四”“本周日”“下周五”等表达，公文含明确日期时以明确日期为准
- 手动创建：保留传统表单入口
- 报名与认定：报名开关、报名审核、二维码/人工签到、第二课堂学分、志愿服务时长
- 学生视角预览：提交前检查学生端展示效果
- 活动管理：状态统计、搜索筛选、详情预览、继续编辑、复制和删除草稿
- 两级审批：发布人提交后依次流转至学院审核老师、学院领导，终审通过后由发布人确认上架
- 审批留痕：记录审批轮次、处理人、意见和时间；任一级驳回后可修改并重新提交
- 分院权限：审核人只能查看和处理本学院、当前节点的待办，重复或越级审批会被拒绝
- 权限占位：通过 `X-User-Id`、`X-User-Role`、`X-User-College` 模拟企业微信登录网关注入的身份

## 技术栈

- 前端：React 18、Vite 6、Tailwind CSS 4、Axios
- 后端：Java 17、Spring Boot 3.2、Spring Data JPA
- 数据库：MySQL 8（测试环境使用 H2）
- AI：DeepSeek Chat Completions API + OpenAI-compatible Image API

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

封面生图使用独立配置，可直接在“AI 设置”中填写生图接口地址、模型和 API Key。默认使用 OpenAI Images API 与 `gpt-image-2`；也可以通过环境变量配置：

```powershell
$env:AI_IMAGE_API_KEY="你的生图 API Key"
$env:AI_IMAGE_API_URL="https://api.openai.com/v1/images/generations"
$env:AI_IMAGE_MODEL="gpt-image-2"
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

页面右上角可切换发布人、学院审核老师、学院领导三种演示身份。演示环境使用以下 ASCII 请求头值，避免 HTTP 请求头包含中文：

- `PUBLISHER` / `COLLEGE_REVIEWER` / `COLLEGE_LEADER`
- 学院编码示例：`INFORMATION_ENGINEERING`

正式环境应由登录网关根据企业微信身份写入这些请求头，不能信任浏览器自行传入的角色。

## 审批状态流转

`DRAFT/REJECTED → PENDING_APPROVAL（学院审核老师）→ PENDING_APPROVAL（学院领导）→ APPROVED → PUBLISHED`

任一审批节点驳回后状态变为 `REJECTED`；发布人修改并重新提交时，审批轮次加一，历史记录保留。

## 主要接口

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

## 测试与构建

```bash
cd backend
mvn test

cd ../frontend
npm run build
```

当前版本用于课程项目原型。正式部署到企业微信前，还需接入企业微信 OAuth、从组织通讯录映射学院与角色，并完善文件存储和生产级消息通知。
