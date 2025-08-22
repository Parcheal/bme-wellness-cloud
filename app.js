// app.js
// 引入 LeanCloud SDK
const AV = require('./libs/av-core-min.js');
const adapters = require('./libs/leancloud-adapters-weapp.js');

// 设置适配器
AV.setAdapters(adapters);

// 初始化 LeanCloud
AV.init({
  appId: '4SGiOp4IDsqsMTbGMOH3wE73-gzGzoHsz',
  appKey: 'E95Rot9tRquVLS3Td6LQIqgI',
  serverURLs: 'https://4sgiop4i.lc-cn-n1-shared.com'
});

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
