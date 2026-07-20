# xxx 校园活动平台

教师贴一段活动文档，AI 自动解析成结构化活动信息，确认后创建活动。

---

## 项目是什么

```
教师打开应用
  → 粘贴提前准备好的活动大纲/文档
  → AI 解析出：标题、分类、时间、地点、人员范围、活动描述等
  → 教师查看预览，修改确认
  → 活动创建完成
```

所有代码都在这个仓库里。后端用 Java（Spring Boot），前端用 React，数据库用 MySQL。

---

## 怎么开始（每个人都要做）

### 1. 装工具

```bash
# 必须装的：
- Docker Desktop（百度搜下载，一直点下一步就行）
- JDK 17（百度搜 "jdk17 下载"）
- Node.js 18+（百度搜 "nodejs 下载"，选 LTS 版）
- Git（百度搜 "git 下载"）
```

### 2. 拉代码

```bash
git clone https://github.com/toTaels/campus-activity.git
cd campus-activity
```

---

## Git 操作指南（不会也要看）

每个人只需要记四条命令：

```bash
# 每天开始写代码前：拉取最新代码
git pull

# 写完一个功能后：保存 + 上传
git add .                          # 暂存所有改动
git commit -m "写清楚你改了什么"    # 提交（引号里用中文描述）
git push                           # 上传到 GitHub
```

**绝对不能做的事：**

| ❌ 禁止 | 原因 |
|--------|------|
| `git push -f` 或 `--force` | 会删掉别人的代码 |
| 改别人写的文件 | 冲突了很麻烦，只动自己的 |
| 提交 `.env`、`.idea/`、`target/` | 已在 `.gitignore` 里排除了，正常情况下提不上去 |

**遇到报错怎么办：**
- 截图发到群里，不要自己乱敲命令
- 最常见的错：忘了先 `git pull`，push 时提示冲突。解决：先 `git pull`，再 `git push`

### 3. 起数据库

```bash
docker-compose up -d
```

执行完 MySQL 就在后台跑着了。端口 3306，密码 root123。

### 4. 起后端

```bash
cd backend
mvn spring-boot:run
```

访问 http://localhost:8080 能看到东西就说明后端跑起来了。

---

## 用 AI 写代码（Vibe Coding）

**把你负责的文件内容发给 AI，告诉它你要做什么，AI 帮你写。**


---

## 成员 A 的任务（3 个文件）

### 你要写的文件

```
backend/src/main/java/com/xxx/campus/service/ActivityService.java
backend/src/main/java/com/xxx/campus/controller/ActivityController.java
backend/src/main/java/com/xxx/campus/config/CorsConfig.java
```

### 直接发给 AI 的 Prompt

```
我在做一个 Spring Boot 3 项目，需要写三个 Java 文件。
项目已有的代码贴在下面，请在这些代码的基础上帮我写。

===== 文件 1：ActivityService.java =====

请写一个 @Service 类 ActivityService，有两个方法：

方法1：parseDocument(String document, String creatorId)
  - 注入 AiService，调用 aiService.parseActivity(document)
  - 检查 AI 返回的结果是否包含必填项：title、location、startTime、endTime
  - 如果有缺失，返回一个 Map：
    {"passed": false, "result": AI解析结果, "missingFields": ["location", "startTime"]}
  - 如果齐全，返回：
    {"passed": true, "result": AI解析结果, "missingFields": []}

方法2：createActivity(ActivityParsedResult result, String creatorId)
  - 把 ActivityParsedResult 转成 Activity 实体
  - 用 ActivityRepository 存到数据库
  - reviewDept、reviewTeacher、reviewLeader 先填"待分配"
  - 返回保存后的 Activity

===== 文件 2：ActivityController.java =====

请写一个 @RestController，两个接口：

POST /api/activities/parse
  - 接收 ActivityRequest（里面有个 document 字段）
  - 暂时用写死的 creatorId = "test_teacher_001"
  - 调用 ActivityService.parseDocument()
  - 返回结果

POST /api/activities
  - 接收 ActivityParsedResult
  - 调用 ActivityService.createActivity()
  - 返回创建成功的 Activity

===== 文件 3：CorsConfig.java =====

请写一个 CORS 配置类，允许 localhost:5173 的跨域请求。

===== 现有代码 =====

[把以下文件内容全部贴在这里：
 pom.xml
 application.yml
 Activity.java
 ActivityRequest.java
 ActivityParsedResult.java
 ActivityPrompt.java
 AiService.java
 HttpAiService.java
 ActivityRepository.java]
```

---

## 成员 B 的任务（React 前端）

### 你要创建的项目

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── pages/
    │   └── CreateActivity.jsx
    ├── components/
    │   ├── ChatBox.jsx
    │   └── ActivityCard.jsx
    └── api/
        └── activity.js
```

### 直接发给 AI 的 Prompt

```
请帮我创建一个 React + Vite + Tailwind CSS 的前端项目，只有一个页面：创建活动。

===== 第一步：搭项目 =====

在当前目录下用 Vite 创建 React 项目：
  npm create vite@latest frontend -- --template react
  cd frontend
  npm install
  npm install tailwindcss @tailwindcss/vite
  npm install axios

请告诉我 tailwind.config.js 和 vite.config.js 应该怎么写。

===== 第二步：创建页面 =====

写一个 CreateActivity.jsx 页面，包含两个核心组件：

组件1：ChatBox.jsx
  - 一个大文本框，placeholder: "请粘贴活动大纲或文档..."
  - 一个发送按钮
  - 点击发送后，调后端 POST http://localhost:8080/api/activities/parse
  - 请求体：{ "document": "文本框里的内容" }
  - 请求期间显示 "AI 正在解析..."
  - 返回结果后传给父组件

组件2：ActivityCard.jsx
  - 收到 AI 解析结果后，展示一张活动预览卡片
  - 卡片包含所有字段（标题、分类、校区、地点、组织者、时间、活动内容等）
  - 每个字段可点击切换为编辑模式（点击文字变输入框）
  - 如果有缺失字段（missingFields 不为空），缺失的字段红色边框高亮
  - 底部有「确认创建」按钮
  - 点击后调 POST http://localhost:8080/api/activities
  - 创建成功后显示 "✅ 活动创建成功"
  - 创建失败显示错误信息

要求：
  - 界面风格参考聊天应用（类似微信聊天框），不是传统表单
  - 教师粘贴文档后，AI 的回复以"气泡"形式展示，气泡里是 ActivityCard
  - 不需要登录功能

===== 第三步：API 封装 =====

写 src/api/activity.js，封装两个请求：
  parseDocument(document) → POST /api/activities/parse
  createActivity(result) → POST /api/activities

===== 后端接口说明 =====

POST /api/activities/parse
  请求：{ "document": "教师粘贴的文档内容" }
  返回：{ "passed": true/false, "result": {解析结果}, "missingFields": [...] }

解析结果（result）的字段：
  { title, category, campus, location, organizer, coverImagePrompt,
    content, startTime, endTime, regStartTime, regEndTime,
    publishTime, offlineTime, maxParticipants, hasPromoMaterial,
    promoApproved, schedule: [{time, content}], materials: [...] }

POST /api/activities
  请求：上面的 result 对象（教师可能已修改）
  返回：创建成功的活动对象
```

---

## 技术栈速览

| 层 | 技术 | 端口 |
|------|------|------|
| 数据库 | MySQL 8.0（Docker） | 3306 |
| 后端 | Java 17 + Spring Boot 3 + JPA | 8080 |
| 前端 | React + Vite + Tailwind | 5173 |
| AI | DeepSeek API（HTTP 直调） | - |

---

## 项目结构

```
campus-activity/
├── docker-compose.yml          ← MySQL 数据库，docker-compose up -d 一键起
├── .gitignore                  ← 哪些文件不上传 git
│
├── backend/                    ← Java 后端
│   ├── pom.xml                 ← Maven 依赖
│   └── src/main/
│       ├── resources/
│       │   ├── schema.sql      ← 建表 SQL
│       │   └── application.yml ← 配置
│       └── java/com/xxx/campus/
│           ├── CampusApplication.java  ← 启动入口
│           ├── model/                  ← 数据模型
│           │   ├── Activity.java       ← 活动实体（对应数据表）
│           │   ├── ActivityRequest.java ← 前端请求
│           │   └── ActivityParsedResult.java ← AI 返回结构
│           ├── prompt/
│           │   └── ActivityPrompt.java ← AI prompt 模板
│           └── service/
│               ├── AiService.java      ← AI 接口
│               ├── HttpAiService.java  ← AI 实现（调 DeepSeek）
│               └── ActivityRepository.java ← 数据库操作
│
├── frontend/                   ← React 前端（B 来创建）
│
└── .env                        ← API 密钥（不提交 git，组长单独发）
```

---

## 本地跑通全流程

```bash
# 终端 1：数据库
docker-compose up -d

# 终端 2：后端
cd backend
set AI_API_KEY=sk-你的key     ← 组长提供
mvn spring-boot:run

# 终端 3：前端
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173 → 粘贴文档 → 查看 AI 解析结果 → 确认创建。
