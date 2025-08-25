/**
 * BME 养生小程序
 * 微信小程序入口文件
 */

const AV = require('./libs/av-core-min.js');
require('./libs/leancloud-adapters-weapp.js');

// LeanCloud 初始化
AV.init({
  appId: 'XXX', // 请在这里填入您的 AppId
  appKey: 'XXX', // 请在这里填入您的 AppKey
  serverURL: 'https://xxx.xxx.com' // 请在这里填入您的服务器地址
});

// 全局 App
App({
  // 小程序启动
  onLaunch: function () {
    console.log('🚀 BME养生小程序启动');
    
    // 初始化推送通知
    this.initPushNotification();
    
    // 检查用户登录状态
    this.checkUserLoginStatus();
  },

  // 小程序显示
  onShow: function (options) {
    console.log('小程序显示', options);
  },

  // 小程序隐藏
  onHide: function () {
    console.log('小程序隐藏');
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
    wx.onPushMessage && wx.onPushMessage((data) => {
      console.log('收到推送消息:', data);
      this.handleWellnessPush(data);
    });
  },

  // 处理养生推送消息
  handleWellnessPush(data) {
    try {
      // 保存推送消息到本地存储
      const pushHistory = wx.getStorageSync('pushHistory') || [];
      pushHistory.unshift({
        ...data,
        receivedAt: new Date().toISOString()
      });
      
      // 只保留最近50条
      if (pushHistory.length > 50) {
        pushHistory.splice(50);
      }
      
      wx.setStorageSync('pushHistory', pushHistory);
      
      // 显示推送内容
      if (data.message) {
        wx.showToast({
          title: data.message,
          icon: 'none',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('处理推送消息失败:', error);
    }
  },

  // 请求推送权限
  requestPushPermission() {
    return new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [], // 这里需要填入您的模板消息ID
        success: (res) => {
          console.log('推送权限请求成功:', res);
          resolve(res);
        },
        fail: (error) => {
          console.error('推送权限请求失败:', error);
          reject(error);
        }
      });
    });
  },

  // 检查用户登录状态
  checkUserLoginStatus() {
    const currentUser = AV.User.current();
    if (currentUser) {
      console.log('用户已登录:', currentUser.get('username'));
      this.globalData.userInfo = currentUser;
    } else {
      console.log('用户未登录');
    }
  },

  // 全局数据
  globalData: {
    userInfo: null,
    version: '1.0.0'
  }
});
