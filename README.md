# AI 荔行——校园文化活动全流程智能体

面向学院师生、适配企业微信工作台的校园活动创建与管理原型。教师既可以用一句话让 AI 生成活动方案，也可以手动填写；生成后可继续编辑、预览学生视角、保存草稿并提交审批。

## 已实现功能

- AI 快速创建：解析活动大纲，生成标题、简介、时间、地点、流程、物料等结构化方案
- 多轮补充：信息不完整时继续输入，AI 重新整理方案
- 手动创建：保留传统表单入口
- 报名与认定：报名开关、报名审核、二维码/人工签到、第二课堂学分、志愿服务时长
- 学生视角预览：提交前检查学生端展示效果
- 活动管理：状态统计、搜索筛选、详情预览、继续编辑、复制和删除草稿
- 审批提交：校验必填信息与时间顺序后进入待审批状态
- 权限占位：通过 `X-User-Id` 区分教师数据，便于后续接入企业微信身份

## 技术栈

- 前端：React 18、Vite 6、Tailwind CSS 4、Axios
- 后端：Java 17、Spring Boot 3.2、Spring Data JPA
- 数据库：MySQL 8（测试环境使用 H2）
- AI：DeepSeek Chat Completions API

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

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：`http://localhost:5173`

如需修改后端地址，可在 `frontend/.env.local` 中配置：

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## 主要接口

- `POST /api/activities/parse`：AI 解析活动描述
- `POST /api/activities`：保存活动草稿
- `GET /api/activities`：分页查询个人活动
- `GET /api/activities/stats`：活动状态统计
- `GET /api/activities/{id}`：查看活动详情
- `PUT /api/activities/{id}`：更新活动草稿
- `POST /api/activities/{id}/submit`：提交审批
- `POST /api/activities/{id}/duplicate`：复制活动
- `DELETE /api/activities/{id}`：删除可编辑草稿

## 测试与构建

```bash
cd backend
mvn test

cd ../frontend
npm run build
```

当前版本用于课程项目原型。正式部署到企业微信前，还需接入企业微信 OAuth、部门/角色权限、真实审批流、消息通知和文件存储。
