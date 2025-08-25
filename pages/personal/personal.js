// pages/personal/personal.js

const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    userInfo: null,
    userProfile: null,
    stats: {
      totalDays: 0,
      healthyMeals: 0,
      totalMeals: 0
    },
    pushEnabled: false, // 推送是否开启
    pushHistory: [] // 推送历史记录
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
    this.checkPushStatus();
    this.loadPushHistory();
  },

  // 加载用户数据
  async loadUserData() {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      this.setData({ userInfo: currentUser });
      
      // 加载用户档案
      await this.loadUserProfile();
      
      // 加载统计数据
      await this.loadStats();
      
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  },

  // 加载用户档案
  async loadUserProfile() {
    try {
      const currentUser = AV.User.current();
      const query = new AV.Query('UserProfile');
      query.equalTo('userId', currentUser.id);
      const profile = await query.first();
      
      if (profile) {
        this.setData({ userProfile: profile.toJSON() });
      }
    } catch (error) {
      console.error('加载用户档案失败:', error);
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      const currentUser = AV.User.current();
      const query = new AV.Query('DailyRecord');
      query.equalTo('userId', currentUser.id);
      const records = await query.find();
      
      let healthyMeals = 0;
      let totalMeals = 0;
      
      records.forEach(record => {
        const data = record.toJSON();
        if (data.meals) {
          Object.values(data.meals).forEach(meal => {
            if (meal.completed) {
              totalMeals++;
              if (meal.healthy) {
                healthyMeals++;
              }
            }
          });
        }
      });
      
      this.setData({
        stats: {
          totalDays: records.length,
          healthyMeals,
          totalMeals
        }
      });
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 编辑档案
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile-setup/profile-setup'
    });
  },

  // 查看历史记录
  viewHistory() {
    wx.showActionSheet({
      itemList: ['查看餐饮记录', '生成健康报告', '查看历史报告'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.viewMealHistory();
            break;
          case 1:
            this.generateHealthReport();
            break;
          case 2:
            this.viewHealthReports();
            break;
        }
      }
    });
  },

  // 查看餐饮历史
  async viewMealHistory() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 获取最近的餐饮记录
      const result = await AV.Cloud.run('getMealRecords', {
        userId: currentUser.id,
        limit: 20
      });

      wx.hideLoading();

      if (result && result.records && result.records.length > 0) {
        // 格式化记录显示
        const items = result.records.map(record => {
          const date = new Date(record.mealTime).toLocaleDateString();
          const time = new Date(record.mealTime).toLocaleTimeString().substr(0, 5);
          return `${date} ${time} - ${record.mealText}`;
        });

        wx.showActionSheet({
          itemList: items.slice(0, 6), // 最多显示6条
          success: (res) => {
            const selectedRecord = result.records[res.tapIndex];
            wx.showModal({
              title: '餐饮记录详情',
              content: `时间：${new Date(selectedRecord.mealTime).toLocaleString()}\n\n食物：${selectedRecord.mealText}\n\n情绪：${selectedRecord.emotion}`,
              showCancel: false
            });
          }
        });
      } else {
        wx.showToast({
          title: '暂无餐饮记录',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('查看餐饮历史失败:', error);
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      });
    }
  },

  // 生成健康报告
  generateHealthReport() {
    wx.showActionSheet({
      itemList: ['生成周报告', '生成月报告', '生成季度报告'],
      success: async (res) => {
        const reportTypes = ['weekly', 'monthly', 'quarterly'];
        const reportNames = ['周', '月', '季度'];
        const reportType = reportTypes[res.tapIndex];
        const reportName = reportNames[res.tapIndex];

        wx.showLoading({ title: `生成${reportName}报告中...` });

        try {
          const currentUser = AV.User.current();
          if (!currentUser) {
            wx.hideLoading();
            wx.showToast({
              title: '请先登录',
              icon: 'none'
            });
            return;
          }

          // 调用云函数生成报告
          const result = await AV.Cloud.run('generateHealthReport', {
            userId: currentUser.id,
            reportType: reportType
          });

          wx.hideLoading();

          if (result && result.report) {
            this.showHealthReport(result.report);
          } else {
            throw new Error('报告生成失败');
          }

        } catch (error) {
          wx.hideLoading();
          console.error('生成健康报告失败:', error);
          
          if (error.message.includes('未找到用户档案')) {
            wx.showModal({
              title: '提示',
              content: '请先完善个人信息才能生成健康报告',
              confirmText: '去完善',
              success: (res) => {
                if (res.confirm) {
                  this.editProfile();
                }
              }
            });
          } else {
            wx.showToast({
              title: '生成报告失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 显示健康报告
  showHealthReport(report) {
    const { statistics, aiAnalysis, reportType } = report;
    const reportName = reportType === 'weekly' ? '周' : reportType === 'monthly' ? '月' : '季度';

    let content = `📊 ${reportName}健康报告\n\n`;
    content += `健康评分：${statistics.healthScore}/100\n`;
    content += `记录餐数：${statistics.totalMeals}次\n`;
    content += `平均情绪：${statistics.averageMoodScore}/5\n\n`;
    content += `📋 AI分析：\n${aiAnalysis}`;

    wx.showModal({
      title: `${reportName}健康分析报告`,
      content: content,
      confirmText: '保存报告',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          // 这里可以添加保存到本地或分享功能
          wx.showToast({
            title: '报告已保存',
            icon: 'success'
          });
        }
      }
    });
  },

  // 查看历史健康报告
  async viewHealthReports() {
    wx.showLoading({ title: '加载报告...' });

    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 查询历史报告
      const query = new AV.Query('HealthReport');
      query.equalTo('userId', currentUser.id);
      query.descending('createdAt');
      query.limit(10);

      const reports = await query.find();
      wx.hideLoading();

      if (reports.length > 0) {
        const items = reports.map(report => {
          const data = report.toJSON();
          const date = new Date(data.createdAt).toLocaleDateString();
          const typeMap = { weekly: '周', monthly: '月', quarterly: '季度' };
          const typeName = typeMap[data.reportType] || data.reportType;
          return `${date} ${typeName}报告 (评分:${data.healthScore})`;
        });

        wx.showActionSheet({
          itemList: items,
          success: (res) => {
            const selectedReport = reports[res.tapIndex].toJSON();
            this.showHealthReport(selectedReport);
          }
        });
      } else {
        wx.showToast({
          title: '暂无历史报告',
          icon: 'none'
        });
      }

    } catch (error) {
      wx.hideLoading();
      console.error('查看历史报告失败:', error);
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      });
    }
  },

  // 检查推送状态
  checkPushStatus() {
    wx.getSetting({
      success: (res) => {
        this.setData({
          pushEnabled: !!res.authSetting['scope.notify']
        });
      }
    });
  },

  // 加载推送历史
  loadPushHistory() {
    const history = wx.getStorageSync('wellness_push_history') || [];
    this.setData({ pushHistory: history.slice(0, 10) }); // 只显示最近10条
  },

  // 切换推送开关
  async togglePush(e) {
    const enabled = e.detail.value;
    
    if (enabled) {
      // 开启推送
      try {
        const app = getApp();
        await app.requestPushPermission();
        
        this.setData({ pushEnabled: true });
        
        wx.showToast({
          title: '推送通知已开启',
          icon: 'success'
        });
        
        // 立即发送一条测试推送
        this.sendTestPush();
        
      } catch (error) {
        this.setData({ pushEnabled: false });
        wx.showToast({
          title: '开启推送失败',
          icon: 'none'
        });
      }
    } else {
      // 关闭推送 - 引导用户到设置页面
      wx.showModal({
        title: '关闭推送通知',
        content: '需要在系统设置中关闭推送权限',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting();
          }
        }
      });
    }
  },

  // 发送测试推送
  async sendTestPush() {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) return;
      
      // 调用云函数发送测试推送
      await AV.Cloud.run('sendTestPush', {
        userId: currentUser.id
      });
      
    } catch (error) {
      console.error('发送测试推送失败:', error);
    }
  },

  // 查看推送历史详情
  viewPushHistory() {
    const { pushHistory } = this.data;
    
    if (pushHistory.length === 0) {
      wx.showToast({
        title: '暂无推送记录',
        icon: 'none'
      });
      return;
    }
    
    // 显示推送历史列表
    const items = pushHistory.map(item => {
      const date = new Date(item.receivedAt).toLocaleDateString();
      return `${date}: ${item.content}`;
    });
    
    wx.showActionSheet({
      itemList: items.slice(0, 6), // 最多显示6条
      success: (res) => {
        const selectedItem = pushHistory[res.tapIndex];
        wx.showModal({
          title: selectedItem.title || '养生提醒',
          content: selectedItem.content,
          showCancel: false
        });
      }
    });
  },

  // 设置
  openSettings() {
    wx.showActionSheet({
      itemList: ['推送设置', '清除缓存', '关于应用'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.openPushSettings();
            break;
          case 1:
            this.clearCache();
            break;
          case 2:
            this.showAbout();
            break;
        }
      }
    });
  },

  // 推送设置
  openPushSettings() {
    wx.showModal({
      title: '推送设置',
      content: '每日养生提醒会根据您的体质和季节变化，为您推送个性化的中医养生建议。建议开启以获得更好的养生体验。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      }
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有本地缓存数据吗？这将清除推送历史记录。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('wellness_push_history');
          this.setData({ pushHistory: [] });
          
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 关于应用
  showAbout() {
    wx.showModal({
      title: '中医养生小助手',
      content: '基于中医体质理论，结合AI技术，为您提供个性化的养生建议和健康指导。\n\n版本：1.0.0\n开发：BME团队',
      showCancel: false
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          AV.User.logOut();
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});
