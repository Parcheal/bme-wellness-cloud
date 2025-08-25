// pages/index/index.js

// 引入我们放在 app.js 里已经初始化好的 AV 对象
const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    username: '', // 用于存储用户输入的用户名
    password: ''  // 用于存储用户输入的密码
  },

  // 当用户名输入框内容变化时触发
  handleUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  // 当密码输入框内容变化时触发
  handlePasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 当用户点击“登录”按钮时触发
  login() {
    // 从 data 中获取当前输入的用户名和密码
    const { username, password } = this.data;

    // 1. 前端简单校验，确保输入不为空
    if (!username || !password) {
      wx.showToast({
        title: '用户名或密码不能为空',
        icon: 'none' // 不显示成功/失败图标
      });
      return;
    }

    // 显示加载动画，提升用户体验
    wx.showLoading({
      title: '登录中...',
    });

    // 2. 调用 LeanCloud 的登录函数
    AV.User.logIn(username, password).then(loginedUser => {
      // 登录成功
      wx.hideLoading(); // 隐藏加载动画
      wx.showToast({
        title: '登录成功！',
        icon: 'success'
      });
      
      console.log('登录成功的用户信息:', loginedUser);
      
      // 登录成功后跳转到个人信息录入页面
      wx.redirectTo({
        url: '/pages/profile-setup/profile-setup'
      });


    }).catch(error => {
      // 登录失败
      wx.hideLoading(); // 隐藏加载动画
      
      // 3. 根据错误码显示不同的提示信息
      let errorMessage = '登录失败';
      if (error.code === 210) {
        errorMessage = '用户名或密码错误';
      } else if (error.code === 211) {
        errorMessage = '找不到该用户';
      } else {
        errorMessage = error.message; // 其他未知错误
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000 // 提示框持续2秒
      });
      console.error('登录失败详情:', error);
    });
  }
});