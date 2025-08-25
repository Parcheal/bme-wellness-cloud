/**
 * LeanCloud 云引擎启动文件
 * BME 养生小程序后端
 */

const AV = require('leanengine');

// 初始化LeanEngine
AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
});

// 引入云函数定义
require('./main');

// 创建Express应用
const app = require('express')();

// 使用LeanEngine中间件
app.use(AV.express());

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
