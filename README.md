# TodoList - 待办事项管理工具

一款轻量级的待办事项网页工具，支持手机端和桌面端访问。

## 功能特性

- 任务增删改查、完成标记
- 任务优先级（高/中/低）、分类标签、截止日期
- 按状态筛选（全部/未完成/已完成）、关键词搜索
- 拖拽排序
- 深色/浅色主题切换
- 数据导入/导出（JSON）
- 删除撤销
- 响应式设计，适配手机和桌面

## 技术栈

**前端：** HTML5 + CSS3 + Vanilla JavaScript  
**后端：** Node.js + Express.js  
**数据库：** Supabase (PostgreSQL)

## 项目结构

```
todo/
├── PRD.md                  # 产品需求文档
├── README.md               # 本文件
├── client/                 # 前端静态文件
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式
│   └── js/
│       ├── api.js          # API 请求层
│       └── app.js          # 应用逻辑
└── server/                 # 后端服务
    ├── package.json
    ├── .env.example         # 环境变量模板
    └── src/
        ├── index.js         # 入口文件
        ├── config/
        │   └── db.js        # Supabase 客户端
        └── routes/
            └── todos.js     # 任务路由
```

## 快速开始

### 前置条件

- Node.js >= 18.x
- Supabase 账号（免费）

### 1. 克隆项目

```bash
git clone <repo-url>
cd todo
```

### 2. 配置 Supabase

1. 前往 [Supabase](https://supabase.com/) 注册并创建项目
2. 在 SQL Editor 中执行以下建表语句：

```sql
create table todos (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  completed boolean default false,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  category text default '',
  due_date timestamptz,
  "order" integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 自动更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger todos_updated_at
  before update on todos
  for each row
  execute function update_updated_at();
```

3. 在项目 Settings -> API 中获取 `Project URL` 和 `anon public` Key

### 3. 启动后端

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入 Supabase URL 和 Key
pnpm install
pnpm dev
```

### 4. 启动前端

前端是纯静态文件，使用任意 HTTP 服务器即可：

```bash
cd client
# 使用 VS Code 的 Live Server 扩展
# 或使用 npx serve
npx serve -p 5500
```

### 5. 配置前端 API 地址

在 `client/js/api.js` 文件开头修改 `API_BASE` 为你的后端地址：

```javascript
const API_BASE = 'http://localhost:3000/api';
```

## 部署

### 前端 -> GitHub Pages

1. 将 `client/` 目录的内容推送到 `gh-pages` 分支
2. 在仓库 Settings -> Pages 中启用 GitHub Pages
3. 修改 `api.js` 中的 `API_BASE` 为生产后端地址

### 后端 -> Railway / Render

1. 在 Railway 或 Render 上创建新项目，连接 GitHub 仓库
2. 设置根目录为 `server`
3. 配置环境变量（参考 `.env.example`）

## 环境变量

| 变量名          | 说明                    |
| --------------- | ----------------------- |
| `PORT`          | 服务端口（默认 3000）   |
| `SUPABASE_URL`  | Supabase 项目 URL       |
| `SUPABASE_KEY`  | Supabase anon public Key|
| `CLIENT_URL`    | 前端地址（CORS 白名单） |
| `NODE_ENV`      | 运行环境                |

## License

MIT
