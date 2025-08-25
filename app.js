/**
 * LeanCloud 云引擎启动文件
 * BME 养生小程序后端
 */

const express = require('express');
const AV = require('leanengine');

// 初始化LeanEngine
AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
});

// 引入云函数定义
require('./cloud/main');

// 创建Express应用
const app = express();

// 使用LeanEngine中间件
app.use(AV.express());

// 解析JSON请求体
app.use(express.json());

// 健康检查接口
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BME养生小程序云引擎运行中',
    timestamp: new Date().toISOString(),
    functions: [
      'wellnessAI',
      'analyzeMealImage', 
      'analyzeConstitution',
      'dailyWellnessPush',
      'sendTestPush',
      'generateHealthReport',
      'shareWellnessPost',
      'getWellnessFeed',
      'likeWellnessPost',
      'saveMealRecord',
      'getMealRecords'
    ]
  });
});

// 云函数调用接口
app.post('/1.1/functions/:name', AV.Cloud.httpHandler);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    error: '服务器内部错误'
  });
});

// 启动云引擎
const PORT = process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error('云引擎启动失败:', err);
  } else {
    console.log('🚀 BME养生小程序云引擎已启动');
    console.log(`📡 服务地址: ${PORT}`);
    console.log(`📅 启动时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('✅ 11个云函数已加载');
  }
});

module.exports = app;
