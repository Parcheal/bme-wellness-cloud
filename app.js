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
  serverURL: 'https://4sgiop4i.lc-cn-n1-shared.com'
});

// 将 AV 对象挂载到全局，方便各页面使用
global.AV = AV;

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

    // 初始化推送通知
    this.initPushNotification();
  },

  // 初始化推送通知
  initPushNotification() {
    // 获取推送授权
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.notify']) {
          // 已经授权，可以直接调用推送相关API
          console.log('推送通知已授权');
          this.setupPushHandlers();
        } else {
          // 没有授权，引导用户开启
          console.log('推送通知未授权，需要引导用户开启');
        }
      }
    });
  },

  // 设置推送消息处理
  setupPushHandlers() {
    // 监听推送消息
    wx.onPushMessage((res) => {
      console.log('收到推送消息:', res);
      
      // 处理养生提醒推送
      if (res.data && res.data.type === 'daily_wellness') {
        this.handleWellnessPush(res.data);
      }
    });
  },

  // 处理养生提醒推送
  handleWellnessPush(data) {
    console.log('处理养生提醒:', data);
    
    // 保存推送内容到本地存储
    const pushHistory = wx.getStorageSync('wellness_push_history') || [];
    pushHistory.unshift({
      ...data,
      receivedAt: new Date().toISOString(),
      read: false
    });
    
    // 只保留最近30天的推送记录
    if (pushHistory.length > 30) {
      pushHistory.splice(30);
    }
    
    wx.setStorageSync('wellness_push_history', pushHistory);
    
    // 如果用户正在使用应用，显示提示
    if (getCurrentPages().length > 0) {
      wx.showToast({
        title: '收到养生提醒',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 申请推送权限
  requestPushPermission() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.notify',
        success: () => {
          console.log('推送权限授权成功');
          this.setupPushHandlers();
          resolve(true);
        },
        fail: () => {
          console.log('推送权限授权失败');
          // 引导用户到设置页面
          wx.showModal({
            title: '开启推送通知',
            content: '开启推送通知，每天接收个性化养生提醒',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    if (settingRes.authSetting['scope.notify']) {
                      this.setupPushHandlers();
                      resolve(true);
                    } else {
                      reject(false);
                    }
                  }
                });
              } else {
                reject(false);
              }
            }
          });
        }
      });
    });
  },

  globalData: {
    userInfo: null
  }
})
