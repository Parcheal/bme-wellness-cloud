# LeanCloud 云函数部署指南 - Git 部署版

## 🎯 概述

本指南将帮助您使用 **Git 部署** 的方式在 LeanCloud 平台上一次性部署所有云函数，为您的养生小程序提供强大的后端支持。

### 🌟 主要优势

✅ **一次性部署** - 所有11个云函数一次性部署完成  
✅ **版本控制** - 完整的 Git 版本管理  
✅ **自动依赖** - 自动安装 node_modules  
✅ **避免错误** - 避免手动复制粘贴错误  
✅ **统一管理** - 所有代码在一个项目中管理  

### 📦 包含的云函数

| 函数名 | 功能描述 | 集成服务 |
|--------|----------|----------|
| `wellnessAI` | 智能养生助手 | OpenAI GPT-3.5 |
| `analyzeMealImage` | 餐食图片识别 | OpenAI GPT-4 Vision |
| `analyzeConstitution` | AI体质分析 | OpenAI GPT-3.5 |
| `dailyWellnessPush` | 每日推送提醒 | OpenAI + LeanCloud Push |
| `sendTestPush` | 推送功能测试 | LeanCloud Push |
| `generateHealthReport` | 健康分析报告 | OpenAI GPT-3.5 |
| `shareWellnessPost` | 分享养生动态 | LeanCloud 数据存储 |
| `getWellnessFeed` | 获取动态流 | LeanCloud 数据存储 |
| `likeWellnessPost` | 点赞动态 | LeanCloud 数据存储 |
| `saveMealRecord` | 保存餐饮记录 | LeanCloud 数据存储 |
| `getMealRecords` | 获取餐饮记录 | LeanCloud 数据存储 |

## 📋 前置条件

1. 已注册 LeanCloud 账号
2. 已创建应用并获取 AppId、AppKey
3. 有权限访问云引擎功能
4. Git 版本控制工具
5. GitHub/GitLab/Gitee 等代码仓库账号

## 🔑 OpenAI API 配置

### API 信息
- **API 密钥**：`sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b`
- **API 主机**：`https://api.chatanywhere.tech`
- **模型**：`gpt-3.5-turbo` 和 `gpt-4-vision-preview`

### 安全提醒
⚠️ **重要**：在实际部署时，请注意：
1. API 密钥已硬编码在云函数中，确保云函数访问权限控制
2. 定期检查 API 使用量，避免超额费用
3. 可以设置使用限制，防止滥用
4. 建议在生产环境中使用环境变量管理密钥

## 🚀 Git 部署步骤

### 步骤 1：准备代码仓库

1. **初始化 Git 仓库**
   ```bash
   # 在项目根目录
   git init
   ```

2. **添加文件到 Git**
   ```bash
   git add .
   git commit -m "Initial commit: 养生小程序云函数"
   ```

3. **创建远程仓库**
   - 在 GitHub/GitLab/Gitee 上创建新仓库
   - 复制仓库 URL

4. **关联远程仓库**
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

### 步骤 2：LeanCloud 控制台配置

1. **登录 LeanCloud 控制台**
   - 访问 [LeanCloud 控制台](https://console.leancloud.cn/)
   - 选择您的应用

2. **进入云引擎部署**
   - 点击左侧 **云引擎**
   - 选择 **部署** 标签页
   - 您应该会看到两个选项：
     - 从 Git 仓库部署
     - 上传文件部署

3. **选择 Git 部署**
   - 点击 **配置 Git** 按钮

### 步骤 3：配置 Git 仓库信息

1. **填写仓库信息**
   - **仓库地址**：填入您的 Git 仓库 URL
     ```
     https://github.com/your-username/your-repo.git
     ```
   - **分支或提交**：填入 `main`（或 `master`）
   - **根目录**：⚠️ **重要！填入 `cloud`**
   - **部署密钥**：如果是私有仓库，需要配置 SSH 密钥

2. **保存配置**
   - 点击 **保存** 按钮
   - 系统会验证仓库访问权限

### 步骤 4：执行部署

1. **开始部署**
   - 点击 **部署到生产环境** 按钮
   - 系统开始自动部署流程

2. **部署过程**
   - 克隆代码仓库
   - 安装依赖 (`npm install`)
   - 部署云函数
   - 验证部署结果

3. **查看部署状态**
   - 在部署日志中查看进度
   - 等待部署完成（通常需要1-3分钟）

### 步骤 5：验证部署结果

1. **检查云函数列表**
   - 进入 **云引擎** → **云函数**
   - 确认所有11个云函数都已部署成功

2. **测试云函数**
   - 点击任意云函数名称
   - 在调试页面测试函数运行

## 📊 数据表准备

在部署云函数之前，请确保在 LeanCloud 控制台中创建以下数据表：

### 1. UserProfile（用户档案）
```javascript
{
  user: Pointer<_User>,           // 用户指针 - 必填
  basicInfo: Object,              // 基本信息（姓名、年龄、性别等）
  constitution: String,           // 体质类型
  constitutionAnalysis: Object,   // 详细体质分析结果
  preferences: Array,             // 饮食偏好
  medicalHistory: String,         // 病史信息
  socialStats: Object            // 社交统计（发帖数、点赞数等）
}
```

### 2. MealRecord（餐饮记录）
```javascript
{
  userProfile: Pointer<UserProfile>, // 用户档案指针 - 必填
  mealImage: String,                 // 餐食图片URL - 必填
  mealTime: Date,                    // 就餐时间 - 必填
  mealText: String,                  // 餐食描述 - 必填
  emotion: String                    // 情绪状态 - 必填
}
```

### 3. DailyRecord（日常记录）
```javascript
{
  userId: String,     // 用户ID - 必填
  date: String,       // 日期 - 必填
  meals: Object,      // 餐食记录
  mood: Number,       // 心情评分
  notes: String       // 备注
}
```

### 4. HealthReport（健康报告）
```javascript
{
  userId: String,         // 用户ID - 必填
  reportType: String,     // 报告类型（weekly/monthly/quarterly）
  dateRange: Object,      // 时间范围
  statistics: Object,     // 统计数据
  aiAnalysis: String,     // AI分析结果
  healthScore: Number     // 健康评分
}
```

### 5. WellnessPost（养生动态）
```javascript
{
  author: Pointer<_User>,              // 作者指针 - 必填
  authorProfile: Pointer<UserProfile>, // 作者档案指针 - 必填
  content: String,                     // 动态内容 - 必填
  images: Array,                       // 图片列表
  tags: Array,                         // 标签列表
  postType: String,                    // 动态类型（general/meal/experience/tips）
  likes: Number,                       // 点赞数
  comments: Number,                    // 评论数
  shares: Number,                      // 分享数
  status: String,                      // 状态（active/hidden/deleted）
  mealRecord: Pointer<MealRecord>      // 关联餐饮记录（可选）
}
```

### 6. LikeRecord（点赞记录）
```javascript
{
  userId: String,    // 用户ID - 必填
  postId: String     // 动态ID - 必填
}
```

## ⏰ 配置定时任务

### 步骤 1：创建定时任务
1. 在 LeanCloud 控制台，进入 **云引擎** → **定时任务**
2. 点击 **创建定时任务**
3. 设置以下参数：
   - **任务名称**：每日养生推送
   - **Cron 表达式**：`0 0 8 * * ?`（每天早上8点执行）
   - **函数名称**：`dailyWellnessPush`
   - **描述**：每日个性化养生提醒推送
   - **时区**：`Asia/Shanghai`

### 步骤 2：启用定时任务
1. 保存定时任务配置
2. 确保任务状态为"启用"
3. 可以点击"立即执行"测试任务

## 📱 推送服务配置

### 步骤 1：开启推送服务
1. 在 LeanCloud 控制台，进入 **消息** → **推送通知**
2. 开启推送服务
3. 配置证书（iOS需要）或 API Key（Android需要）

### 步骤 2：小程序推送配置
小程序的推送通知已在 `app.js` 中自动处理：
- 自动检测推送权限
- 引导用户开启推送
- 处理推送消息
- 本地存储推送历史

## 🔄 更新云函数代码

当您需要更新云函数代码时：

1. **修改代码**
   ```bash
   # 修改 cloud/main.js 中的云函数代码
   ```

2. **提交更改**
   ```bash
   git add .
   git commit -m "更新云函数：修复bug/新增功能"
   git push origin main
   ```

3. **重新部署**
   - 在 LeanCloud 控制台，进入 **云引擎** → **部署**
   - 点击 **部署到生产环境**
   - 系统会自动拉取最新代码并部署

## ✅ 部署验证

### 验证方法 1：控制台测试
1. 进入 **云引擎** → **云函数**
2. 点击任意函数名称
3. 在调试页面输入测试参数并运行

### 验证方法 2：小程序测试
1. 登录小程序并完善个人信息
2. 测试各个功能模块
3. 查看云函数调用是否正常

## 🧪 功能测试指南

### 测试养生助手AI功能
1. 进入"养生助手"页面
2. 尝试提问：
   - "我是气虚体质，秋天应该怎么养生？"
   - "经常熬夜，有什么调理建议？"
   - "适合我体质的运动有哪些？"

### 测试拍照识餐功能
1. 在首页点击餐次进行打卡
2. 点击"拍照识别"按钮
3. 选择拍照或从相册选择餐食图片
4. 等待AI识别并自动填入食物名称

### 测试推送通知功能
1. 进入"我的"页面，开启推送通知开关
2. 授权推送权限，会立即收到测试推送
3. 等待每天早上8点的自动推送

### 测试健康分析功能
1. 记录一些餐饮数据（建议至少3-5天）
2. 在"我的"页面，点击"查看历史记录"
3. 选择"生成健康报告"
4. 查看AI生成的个性化健康分析报告

### 测试社交功能
1. 进入"养生圈"页面
2. 点击右下角的"分享"按钮发布动态
3. 浏览和点赞其他用户的分享
4. 使用顶部筛选栏筛选不同类型的动态

## ⚠️ 注意事项

1. **根目录配置**：Git部署时必须设置根目录为 `cloud`
2. **依赖管理**：`package.json` 中的依赖会自动安装
3. **权限设置**：确保云函数有读写数据表的权限
4. **错误处理**：查看云引擎日志定位问题
5. **性能优化**：查询限制最大100条记录

## 🎉 部署完成

恭喜！您已成功使用 Git 方式部署了完整的云函数系统！

### 已部署的功能
- ✅ 智能养生助手（wellnessAI）- 集成OpenAI API
- ✅ 拍照识餐功能（analyzeMealImage）- 使用OpenAI视觉API  
- ✅ AI体质分析（analyzeConstitution）- OpenAI体质分析
- ✅ 每日养生推送（dailyWellnessPush）- 个性化定时推送
- ✅ 餐饮记录管理（saveMealRecord, getMealRecords）
- ✅ 健康分析报告（generateHealthReport）- AI数据分析
- ✅ 社交功能（shareWellnessPost, getWellnessFeed, likeWellnessPost）
- ✅ 推送测试（sendTestPush）

## 🔍 故障排除

### 常见问题

1. **部署失败**
   - 检查 Git 仓库地址是否正确
   - 确认根目录设置为 `cloud`
   - 查看部署日志中的错误信息

2. **云函数调用失败**
   - 检查数据表是否创建
   - 确认函数参数是否正确
   - 查看云引擎日志

3. **OpenAI API 调用失败**
   - 检查 API 密钥是否有效
   - 确认网络连接正常
   - 查看 API 使用量限制

### 查看日志
- **部署日志**：云引擎 → 部署 → 查看部署历史
- **运行日志**：云引擎 → 日志 → 实时日志

## 📞 技术支持

如果遇到技术问题：
1. 查看 LeanCloud 控制台的云函数日志
2. 确认 OpenAI API 调用是否成功
3. 验证小程序端的网络请求
4. 参考 LeanCloud 官方文档：https://docs.leancloud.cn/

现在您的中医养生小程序已经具备了完整的后端支持和真正的AI能力！🎊