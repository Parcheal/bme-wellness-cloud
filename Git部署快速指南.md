# 🚀 Git 部署快速指南

## 📝 部署前准备

确保您已经：
- [x] 注册 LeanCloud 账号并创建应用
- [x] 拥有 GitHub/GitLab/Gitee 账号
- [x] 本地安装了 Git

## 🎯 部署步骤（5分钟完成）

### 第1步：创建 Git 仓库

1. **在 GitHub 上创建新仓库**
   - 登录 GitHub，点击右上角 "+"
   - 选择 "New repository"
   - 输入仓库名称（如 `bme-wellness-cloud`）
   - 设置为 Public（推荐）或 Private
   - 点击 "Create repository"

2. **复制仓库地址**
   ```
   https://github.com/your-username/bme-wellness-cloud.git
   ```

### 第2步：提交代码到 Git

在项目根目录执行：

```bash
# 初始化 Git
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "部署养生小程序云函数"

# 关联远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/your-username/bme-wellness-cloud.git

# 推送到 GitHub
git push -u origin main
```

### 第3步：LeanCloud Git 部署

1. **进入 LeanCloud 控制台**
   - 访问 https://console.leancloud.cn/
   - 选择您的应用

2. **配置 Git 部署**
   - 点击 **云引擎** → **部署**
   - 点击 **配置 Git** 按钮

3. **填写配置信息**
   ```
   仓库地址: https://github.com/your-username/bme-wellness-cloud.git
   分支: main
   根目录: cloud
   ```
   ⚠️ **重要：根目录必须填写 `cloud`**

4. **开始部署**
   - 点击 **保存**
   - 点击 **部署到生产环境**
   - 等待部署完成（1-3分钟）

### 第4步：验证部署

1. **检查云函数**
   - 进入 **云引擎** → **云函数**
   - 确认看到11个云函数：
     - `wellnessAI`
     - `analyzeMealImage`
     - `analyzeConstitution`
     - `dailyWellnessPush`
     - `sendTestPush`
     - `generateHealthReport`
     - `shareWellnessPost`
     - `getWellnessFeed`
     - `likeWellnessPost`
     - `saveMealRecord`
     - `getMealRecords`

2. **测试一个云函数**
   - 点击 `wellnessAI` 函数名
   - 在调试页面输入：
     ```json
     {
       "prompt": "你好",
       "userProfile": {
         "constitution": "平和体质"
       }
     }
     ```
   - 点击 **运行**，应该返回AI回复

## 📊 创建数据表

在 LeanCloud 控制台的 **数据存储** → **结构化数据** 中创建：

| 表名 | 用途 | 必需字段 |
|------|------|----------|
| `UserProfile` | 用户档案 | `user`, `constitution` |
| `MealRecord` | 餐饮记录 | `userProfile`, `mealImage`, `mealTime`, `mealText`, `emotion` |
| `HealthReport` | 健康报告 | `userId`, `reportType` |
| `WellnessPost` | 养生动态 | `author`, `content` |
| `LikeRecord` | 点赞记录 | `userId`, `postId` |

⚠️ **重要提示**：数据表可以在使用过程中自动创建，暂时跳过也可以。

## ⏰ 配置定时推送（可选）

1. **创建定时任务**
   - 进入 **云引擎** → **定时任务**
   - 点击 **创建定时任务**

2. **设置参数**
   ```
   任务名称: 每日养生推送
   Cron表达式: 0 0 8 * * ?
   函数名称: dailyWellnessPush
   时区: Asia/Shanghai
   ```

3. **保存并启用**

## 🔄 更新云函数（日常使用）

当需要更新云函数代码时：

```bash
# 修改 cloud/main.js 中的代码

# 提交更改
git add .
git commit -m "更新云函数"
git push origin main

# 在 LeanCloud 控制台重新部署
# 云引擎 → 部署 → 部署到生产环境
```

## ✅ 部署完成检查清单

- [x] Git 仓库创建成功
- [x] 代码推送到远程仓库
- [x] LeanCloud Git 部署配置正确
- [x] 11个云函数部署成功
- [x] 至少测试一个云函数运行正常
- [x] 小程序可以正常调用云函数

## 🎉 大功告成！

现在您的养生小程序拥有了：
- 🤖 **智能AI助手** - 基于OpenAI的专业养生建议
- 📸 **拍照识餐** - AI识别食物并给出健康建议  
- 📊 **健康报告** - 个性化数据分析
- 🔔 **智能推送** - 每日个性化提醒
- 👥 **社交圈子** - 用户分享和互动

## ❓ 常见问题

**Q: 部署失败怎么办？**  
A: 检查根目录是否设置为 `cloud`，查看部署日志中的错误信息。

**Q: 云函数调用失败？**  
A: 确认小程序中的 AppId 和 AppKey 配置正确。

**Q: AI功能不工作？**  
A: OpenAI API 密钥已内置，如果不工作可能是网络问题，函数会自动降级到本地逻辑。

**Q: 如何查看日志？**  
A: 云引擎 → 日志 → 实时日志

需要帮助？参考详细的 [LeanCloud云函数部署指南.md](./LeanCloud云函数部署指南.md)
