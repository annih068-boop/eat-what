# 明天吃啥好

这是一个无需构建工具即可运行的静态网页，直接打开 `index.html` 即可体验。

## 已实现

- 注册和登录账号
- 每个账号独立保存自己上传的菜品
- 确认午饭或晚饭后，自动保存近 30 天点餐记录
- 分享当前菜单和明日计划的链接
- 生成并下载明日食谱图片

## 发布给朋友使用

### 1. 安装 Git 并上传到 GitHub

当前电脑没有检测到 Git。先安装 [Git for Windows](https://git-scm.com/download/win)，安装完成后重新打开 PowerShell，然后在项目目录执行：

```powershell
git init
git add .
git commit -m "初始版本"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

也可以安装 GitHub Desktop，用 `Add an existing repository` 选择这个文件夹，再发布到 GitHub。

### 2. 开启 GitHub Pages

打开 GitHub 仓库的 `Settings -> Pages`，选择 `Deploy from a branch`，分支选择 `main`，目录选择 `/ (root)`，点击保存。等待几分钟后，GitHub 会生成一个 `https://你的用户名.github.io/仓库名/` 地址。

### 3. 创建 Supabase 项目

1. 在 Supabase 新建项目，记住数据库密码。
2. 打开 `SQL Editor`，执行项目里的 [supabase-schema.sql](supabase-schema.sql)。
3. 在 `Authentication -> Providers` 开启 `Email`，开发阶段可以关闭邮箱验证，正式使用建议开启。
4. 在 `Project Settings -> API` 复制 `Project URL` 和 `anon public key`。

### 4. 把网页接到 Supabase

当前页面还是 `localStorage` 版本。需要把 `app.js` 的以下逻辑替换为 Supabase API：

- 注册：`supabase.auth.signUp({ email, password })`
- 登录：`supabase.auth.signInWithPassword({ email, password })`
- 菜品：写入 `public.dishes`
- 图片：上传到 `dish-images/{用户 id}/文件名`，再把公开 URL 写入 `image_url`
- 点餐记录：写入 `meal_plans` 和 `meal_plan_dishes`
- 历史记录：按 `auth.uid()` 查询最近 30 天

前端只使用 Supabase 的 `anon public key`，不要把 `service_role key` 放进网页。数据库安全依赖 `supabase-schema.sql` 中的 RLS 策略。

### 5. 重新发布

接入 Supabase 后执行：

```powershell
git add .
git commit -m "接入 Supabase 账号和数据"
git push
```

GitHub Pages 会自动更新。

分享链接会将当前菜单和明日计划放在 URL 的 `#share=` 数据中。当前版本的账号数据保存在浏览器 `localStorage`，要实现跨设备注册、登录和同步，需要完成第 4 步的 Supabase 接入。
