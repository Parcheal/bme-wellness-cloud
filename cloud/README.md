# BME 养生小程序 - LeanCloud 云引擎部署指南

## 📋 项目简介

本项目是 BME 养生小程序的后端云函数，基于 LeanCloud 云引擎，集成了 OpenAI API 提供智能养生建议。

## 🚀 快速部署

### 方法一：Git 部署（推荐）

1. **准备 Git 仓库**
   ```bash
   # 在项目根目录初始化 Git
   git init
   
   # 添加所有文件
   git add .
   
   # 提交代码
   git commit -m "Initial commit: 养生小程序云函数"
   
   # 添加远程仓库（使用 GitHub/GitLab/Gitee 等）
   git remote add origin https://github.com/your-username/your-repo.git
   
   # 推送到远程仓库
   git push -u origin main
   ```

2. **LeanCloud 控制台配置**
   - 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
   - 进入您的应用
   - 点击 **云引擎** → **部署**
   - 选择 **Git 部署**

3. **配置 Git 仓库**
   - 仓库地址：填入您的 Git 仓库 URL
   - 分支或提交：选择 `main` 分支
   - 根目录：填入 `cloud`（重要！）
   - 点击 **部署到生产环境**

### 方法二：压缩包上传

1. **打包云函数文件**
   ```bash
   # 将 cloud 目录打包为 zip 文件
   zip -r cloud-functions.zip cloud/
   ```

2. **上传部署**
   - LeanCloud 控制台 → **云引擎** → **部署**
   - 选择 **上传文件**
   - 上传 `cloud-functions.zip` 文件
   - 点击 **部署到生产环境**

## 📦 云函数列表

本项目包含以下云函数：

| 函数名 | 功能描述 | 用途 |
|--------|----------|------|
| `saveMealRecord` | 保存餐饮记录 | 首页餐饮打卡 |
| `getMealRecords` | 获取餐饮记录 | 个人中心查看历史 |
| `wellnessAI` | AI养生助手 | 智能对话咨询 |
| `analyzeMealImage` | 餐食图片识别 | 拍照识别食物 |
| `analyzeConstitution` | AI体质分析 | 个人档案设置 |
| `dailyWellnessPush` | 每日推送 | 定时任务推送 |
| `sendTestPush` | 测试推送 | 推送功能测试 |
| `generateHealthReport` | 健康报告 | 生成分析报告 |
| `shareWellnessPost` | 分享动态 | 社交功能 |
| `getWellnessFeed` | 获取动态流 | 社交功能 |
| `likeWellnessPost` | 点赞动态 | 社交功能 |

## 🔧 环境配置

### OpenAI API 配置

在代码中已配置以下 OpenAI API 信息：
- **API 密钥**: `sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b`
- **API 主机**: `https://api.chatanywhere.tech`

### 依赖包管理

项目依赖已在 `package.json` 中配置：
```json
{
  "dependencies": {
    "node-fetch": "^2.6.7"
  }
}
```

## 📚 数据表准备

确保在 LeanCloud 控制台创建以下数据表：

### 1. UserProfile（用户档案）
```javascript
{
  user: Pointer<_User>,           // 用户指针
  basicInfo: Object,              // 基本信息
  constitution: String,           // 体质类型
  constitutionAnalysis: Object,   // 体质分析结果
  socialStats: Object            // 社交统计
}
```

### 2. MealRecord（餐饮记录）
```javascript
{
  userProfile: Pointer<UserProfile>, // 用户档案指针
  mealImage: String,                 // 餐食图片URL
  mealTime: Date,                    // 就餐时间
  mealText: String,                  // 餐食描述
  emotion: String                    // 情绪状态
}
```

### 3. DailyRecord（日常记录）
```javascript
{
  userId: String,     // 用户ID
  date: String,       // 日期
  meals: Object,      // 餐食记录
  mood: Number,       // 心情评分
  notes: String       // 备注
}
```

### 4. HealthReport（健康报告）
```javascript
{
  userId: String,         // 用户ID
  reportType: String,     // 报告类型
  dateRange: Object,      // 时间范围
  statistics: Object,     // 统计数据
  aiAnalysis: String,     // AI分析
  healthScore: Number     // 健康评分
}
```

### 5. WellnessPost（养生动态）
```javascript
{
  author: Pointer<_User>,           // 作者指针
  authorProfile: Pointer<UserProfile>, // 作者档案指针
  content: String,                     // 动态内容
  images: Array,                       // 图片列表
  tags: Array,                         // 标签列表
  postType: String,                    // 动态类型
  likes: Number,                       // 点赞数
  comments: Number,                    // 评论数
  shares: Number,                      // 分享数
  status: String,                      // 状态
  mealRecord: Pointer<MealRecord>      // 关联餐饮记录
}
```

### 6. LikeRecord（点赞记录）
```javascript
{
  userId: String,    // 用户ID
  postId: String     // 动态ID
}
```

## ⏰ 定时任务配置

### 配置每日推送任务

1. **进入云引擎控制台**
   - LeanCloud 控制台 → **云引擎** → **定时任务**

2. **创建定时任务**
   - 任务名称：`每日养生推送`
   - 云函数名：`dailyWellnessPush`
   - Cron 表达式：`0 0 8 * * ?`（每天早上8点执行）
   - 时区：`Asia/Shanghai`

3. **启用任务**
   - 保存并启用定时任务

## 📱 推送服务配置

### iOS 推送证书配置

1. **上传推送证书**
   - LeanCloud 控制台 → **消息** → **推送** → **设置**
   - 上传 iOS 推送证书

### Android 推送配置

1. **配置推送参数**
   - 根据具体的推送厂商配置相应参数

## 🧪 功能测试

### 1. 测试云函数

```javascript
// 在 LeanCloud 控制台的云引擎调试界面测试
AV.Cloud.run('wellnessAI', {
  prompt: '我最近总是感觉疲劳，有什么建议吗？',
  userProfile: {
    constitution: '气虚体质'
  }
});
```

### 2. 测试推送功能

```javascript
AV.Cloud.run('sendTestPush', {
  userId: 'your-user-id'
});
```

### 3. 测试图片分析

```javascript
AV.Cloud.run('analyzeMealImage', {
  imageUrl: 'https://example.com/meal.jpg',
  userProfile: {
    constitution: '平和体质'
  }
});
```

## 🔍 故障排除

### 常见问题

1. **云函数调用失败**
   - 检查云函数是否部署成功
   - 查看云引擎日志

2. **OpenAI API 调用失败**
   - 检查 API 密钥是否正确
   - 确认网络连接正常

3. **推送发送失败**
   - 检查推送证书配置
   - 确认用户已授权推送

### 日志查看

1. **云引擎日志**
   - LeanCloud 控制台 → **云引擎** → **日志**

2. **调试输出**
   - 在云函数中使用 `console.log()` 输出调试信息

## 📈 性能监控

### 监控指标

- 云函数调用次数
- 平均响应时间
- 错误率统计
- OpenAI API 调用量

### 优化建议

1. **使用缓存减少重复计算**
2. **合理设置超时时间**
3. **监控 API 调用频率**
4. **优化数据库查询**

## 🔐 安全注意事项

1. **API 密钥安全**
   - 定期更换 OpenAI API 密钥
   - 监控 API 使用量

2. **数据安全**
   - 用户数据加密存储
   - 定期备份重要数据

3. **访问控制**
   - 设置合理的 ACL 权限
   - 限制云函数调用频率

## 📞 技术支持

如有问题，请联系：
- LeanCloud 官方文档：https://docs.leancloud.cn/
- OpenAI API 文档：https://platform.openai.com/docs

---

部署完成后，您的养生小程序将拥有完整的后端支持，包括智能AI助手、图片识别、推送通知、健康分析等功能！🎉
