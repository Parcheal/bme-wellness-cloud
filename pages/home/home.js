// pages/home/home.js

const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    currentWeek: [], // 当前周的数据
    selectedDate: '', // 选中的日期
    selectedMeal: '', // 选中的餐次
    todayMeals: {
      breakfast: { completed: false, foods: [], mood: 3, healthy: true },
      lunch: { completed: false, foods: [], mood: 3, healthy: true },
      dinner: { completed: false, foods: [], mood: 3, healthy: true }
    },
    currentMood: 3, // 当前情绪 1-5
    foodInput: '', // 食物输入
    showCheckIn: false, // 显示打卡弹窗
    userProfile: null, // 用户档案
    userInfo: null, // 用户登录信息
    
    // 拍照识餐相关
    mealImage: '', // 选择的餐食图片
    imageAnalyzing: false, // 是否正在分析图片
    imageAnalysisResult: '', // 图片分析结果
    showImagePreview: false // 是否显示图片预览
  },

  onLoad() {
    this.initWeekData();
    this.checkUserStatus();
    this.loadTodayData();
  },

  onShow() {
    this.checkUserStatus();
    this.loadTodayData();
  },

  // 检查用户状态
  checkUserStatus() {
    const currentUser = AV.User.current();
    this.setData({ userInfo: currentUser });
    
    if (currentUser) {
      console.log('用户已登录:', currentUser.toJSON());
      this.loadUserProfile();
    } else {
      console.log('用户未登录');
      this.setData({ userProfile: null });
    }
  },

  // 初始化一周数据
  initWeekData() {
    const week = [];
    const today = new Date();
    
    // 获取本周一
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      week.push({
        date: date.toISOString().split('T')[0],
        dayName: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
        meals: {
          breakfast: { completed: false, healthy: true },
          lunch: { completed: false, healthy: true },
          dinner: { completed: false, healthy: true }
        }
      });
    }
    
    this.setData({ currentWeek: week });
  },

  // 加载用户档案
  async loadUserProfile() {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) return;

      const UserProfile = AV.Object.extend('UserProfile');
      const query = new AV.Query(UserProfile);
      query.equalTo('user', currentUser); // 使用 user Pointer 而不是 userId
      const profile = await query.first();
      
      if (profile) {
        this.setData({ userProfile: profile.toJSON() });
        console.log('用户档案加载成功:', profile.toJSON());
      } else {
        console.log('未找到用户档案，用户需要先完善个人信息');
      }
    } catch (error) {
      console.error('加载用户档案失败:', error);
    }
  },

  // 加载今日数据
  async loadTodayData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentUser = AV.User.current();
      if (!currentUser) return;

      const query = new AV.Query('DailyRecord');
      query.equalTo('userId', currentUser.id);
      query.equalTo('date', today);
      const record = await query.first();
      
      if (record) {
        const data = record.toJSON();
        this.setData({ todayMeals: data.meals || this.data.todayMeals });
        this.updateWeekDisplay();
      }
    } catch (error) {
      console.error('加载今日数据失败:', error);
    }
  },

  // 更新周显示
  updateWeekDisplay() {
    const today = new Date().toISOString().split('T')[0];
    const week = this.data.currentWeek.map(day => {
      if (day.date === today) {
        day.meals = {
          breakfast: { 
            completed: this.data.todayMeals.breakfast.completed,
            healthy: this.data.todayMeals.breakfast.healthy
          },
          lunch: { 
            completed: this.data.todayMeals.lunch.completed,
            healthy: this.data.todayMeals.lunch.healthy
          },
          dinner: { 
            completed: this.data.todayMeals.dinner.completed,
            healthy: this.data.todayMeals.dinner.healthy
          }
        };
      }
      return day;
    });
    
    this.setData({ currentWeek: week });
  },

  // 点击餐次进行打卡
  onMealTap(e) {
    const { date, meal } = e.currentTarget.dataset;
    const today = new Date().toISOString().split('T')[0];
    
    if (date !== today) {
      wx.showToast({
        title: '只能为今天打卡',
        icon: 'none'
      });
      return;
    }

    this.setData({
      selectedDate: date,
      selectedMeal: meal,
      showCheckIn: true,
      foodInput: this.data.todayMeals[meal].foods.join(', '),
      currentMood: this.data.todayMeals[meal].mood || 3
    });
  },

  // 关闭打卡弹窗
  closeCheckIn() {
    this.setData({ 
      showCheckIn: false,
      mealImage: '',
      imageAnalysisResult: '',
      showImagePreview: false
    });
  },

  // 拍照识别餐食
  async takeMealPhoto() {
    try {
      // 选择图片
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      if (res.tempFiles && res.tempFiles.length > 0) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({ title: '上传图片中...' });
        
        // 上传图片到LeanCloud
        const imageUrl = await this.uploadImageToLeanCloud(tempFilePath);
        
        this.setData({
          mealImage: imageUrl,
          showImagePreview: true
        });

        wx.hideLoading();
        
        // 开始分析图片
        await this.analyzeMealImage(imageUrl);
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('拍照失败:', error);
      wx.showToast({
        title: '拍照失败，请重试',
        icon: 'none'
      });
    }
  },

  // 上传图片到LeanCloud
  async uploadImageToLeanCloud(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 生成唯一文件名
      const fileName = `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      // 创建AV.File对象
      const file = new AV.File(fileName, {
        blob: {
          uri: tempFilePath,
        },
      });

      // 上传文件
      file.save().then((savedFile) => {
        console.log('图片上传成功:', savedFile.url());
        resolve(savedFile.url());
      }).catch((error) => {
        console.error('图片上传失败:', error);
        reject(error);
      });
    });
  },

  // 分析餐食图片
  async analyzeMealImage(imageUrl) {
    this.setData({ imageAnalyzing: true });
    
    wx.showLoading({ title: 'AI识别中...' });

    try {
      // 调用云函数进行图片分析
      const result = await AV.Cloud.run('analyzeMealImage', {
        imageUrl: imageUrl,
        userProfile: this.data.userProfile
      });

      if (result && result.analysis) {
        this.setData({
          imageAnalysisResult: result.analysis,
          foodInput: result.foodList || result.analysis
        });
        
        wx.showToast({
          title: '识别成功！',
          icon: 'success'
        });
      } else {
        throw new Error('图片分析结果格式错误');
      }

    } catch (error) {
      console.error('图片分析失败:', error);
      
      // 使用备用方案：让用户手动输入
      wx.showModal({
        title: '智能识别失败',
        content: '图片识别服务暂时不可用，请手动输入您的餐食内容。',
        showCancel: false
      });
      
      // 简单的本地分析逻辑
      this.setData({
        imageAnalysisResult: '图片已保存，请手动输入餐食内容',
        foodInput: ''
      });
      
    } finally {
      wx.hideLoading();
      this.setData({ imageAnalyzing: false });
    }
  },

  // 重新拍照
  retakePhoto() {
    this.setData({
      mealImage: '',
      imageAnalysisResult: '',
      showImagePreview: false,
      foodInput: ''
    });
    this.takeMealPhoto();
  },

  // 确认使用识别结果
  confirmImageAnalysis() {
    // 分析结果已经设置到foodInput中，用户可以继续编辑
    this.setData({
      showImagePreview: false
    });
  },

  // 食物输入
  onFoodInput(e) {
    this.setData({ foodInput: e.detail.value });
  },

  // 情绪滑块变化
  onMoodChange(e) {
    this.setData({ currentMood: e.detail.value });
  },

  // 保存打卡
  async saveCheckIn() {
    const { selectedMeal, foodInput, currentMood } = this.data;
    
    if (!foodInput.trim()) {
      wx.showToast({
        title: '请输入食物',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 分析食物健康度
      const isHealthy = await this.analyzeFood(foodInput, selectedMeal);
      
      // 更新本地数据
      const meals = { ...this.data.todayMeals };
      meals[selectedMeal] = {
        completed: true,
        foods: foodInput.split(',').map(f => f.trim()),
        mood: currentMood,
        healthy: isHealthy,
        timestamp: new Date()
      };
      
      this.setData({ todayMeals: meals });
      
      // 保存到数据库（旧的方式）
      await this.saveTodayRecord(meals);
      
      // 保存餐饮记录（包含图片）
      await this.saveMealRecord(selectedMeal, foodInput, currentMood, this.data.mealImage);
      
      // 更新显示
      this.updateWeekDisplay();
      
      wx.hideLoading();
      this.closeCheckIn();
      
      wx.showToast({
        title: '打卡成功！',
        icon: 'success'
      });

      // 如果判断不健康，跳转到干预页面
      if (!isHealthy) {
        setTimeout(() => {
          wx.showModal({
            title: '健康提醒',
            content: '检测到这餐可能不太适合您的体质，需要进一步分析吗？',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: `/pages/intervention/intervention?meal=${selectedMeal}&foods=${foodInput}&mood=${currentMood}`
                });
              }
            }
          });
        }, 1000);
      }

    } catch (error) {
      wx.hideLoading();
      console.error('保存打卡失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 保存餐饮记录到云端
  async saveMealRecord(mealType, foodInput, mood, imageUrl = '') {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        console.log('用户未登录，跳过 saveMealRecord 测试');
        return;
      }

      // 获取情绪描述
      const emotionMap = {
        1: '很沮丧',
        2: '有点难过', 
        3: '一般',
        4: '开心',
        5: '非常开心'
      };
      const emotionText = emotionMap[mood] || '一般';

      // 调用云函数
      console.log('调用 saveMealRecord 云函数保存记录...');
      const result = await AV.Cloud.run('saveMealRecord', {
        userId: currentUser.id,
        mealImage: imageUrl || 'https://example.com/default-meal.jpg', // 使用实际拍摄的图片
        mealTime: new Date().toISOString(),
        mealText: foodInput,
        emotion: emotionText
      });

      console.log('saveMealRecord 云函数调用成功:', result);
      
      // 显示成功提示
      setTimeout(() => {
        wx.showToast({
          title: `新记录已保存：${result.mealRecordId}`,
          icon: 'none',
          duration: 3000
        });
      }, 2000);

    } catch (error) {
      console.error('saveMealRecord 云函数调用失败:', error);
      
      // 显示错误提示
      setTimeout(() => {
        wx.showModal({
          title: '云函数测试',
          content: `saveMealRecord 调用失败：${error.message}`,
          showCancel: false
        });
      }, 2000);
    }
  },

  // 分析食物健康度（简化版）
  async analyzeFood(foods, meal) {
    try {
      const { userProfile } = this.data;
      if (!userProfile) return true;

      // 简单的规则判断
      const constitution = userProfile.constitutionAnalysis?.constitution || '';
      const foodList = foods.toLowerCase();
      
      // 基本不健康判断
      if (foodList.includes('油炸') || foodList.includes('烧烤') || 
          foodList.includes('泡面') || foodList.includes('可乐')) {
        return false;
      }
      
      // 根据体质判断（简化）
      if (constitution.includes('湿热') && (foodList.includes('辣') || foodList.includes('火锅'))) {
        return false;
      }
      
      if (constitution.includes('阳虚') && foodList.includes('冰')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('分析食物失败:', error);
      return true;
    }
  },

  // 保存今日记录
  async saveTodayRecord(meals) {
    const today = new Date().toISOString().split('T')[0];
    const currentUser = AV.User.current();
    if (!currentUser) return;

    try {
      // 查找今日记录
      const query = new AV.Query('DailyRecord');
      query.equalTo('userId', currentUser.id);
      query.equalTo('date', today);
      let record = await query.first();
      
      if (!record) {
        const DailyRecord = AV.Object.extend('DailyRecord');
        record = new DailyRecord();
        record.set('userId', currentUser.id);
        record.set('date', today);
      }
      
      record.set('meals', meals);
      record.set('updatedAt', new Date());
      
      await record.save();
    } catch (error) {
      console.error('保存记录失败:', error);
      throw error;
    }
  },

  // 直接测试 saveMealRecord 云函数
  async testSaveMealRecordDirectly() {
    wx.showModal({
      title: '选择测试方式',
      content: '请选择测试方式：\n\n1. 云函数方式（需要先部署）\n2. 客户端直接操作（临时方案）',
      confirmText: '云函数',
      cancelText: '客户端',
      success: async (res) => {
        if (res.confirm) {
          // 使用云函数方式
          await this.testWithCloudFunction();
        } else {
          // 使用客户端直接操作
          await this.testWithDirectOperation();
        }
      }
    });
  },

  // 使用云函数方式测试
  async testWithCloudFunction() {
    wx.showLoading({ title: '检查状态...' });

    try {
      // 检查用户登录状态
      const currentUser = AV.User.current();
      console.log('当前用户状态:', currentUser);
      
      if (!currentUser) {
        wx.hideLoading();
        wx.showModal({
          title: '需要登录',
          content: '测试云函数需要先登录，是否现在去登录？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }
          }
        });
        return;
      }

      // 检查是否有UserProfile
      wx.showLoading({ title: '检查用户档案...' });
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('user', currentUser);
      const userProfile = await profileQuery.first();
      
      if (!userProfile) {
        wx.hideLoading();
        wx.showModal({
          title: '需要完善信息',
          content: '测试前需要先完善个人信息，是否现在去完善？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile-setup/profile-setup'
              });
            }
          }
        });
        return;
      }

      // 开始测试云函数
      wx.showLoading({ title: '测试云函数...' });
      console.log('开始测试 saveMealRecord 云函数，用户ID:', currentUser.id);
      
      const testParams = {
        userId: currentUser.id,
        mealImage: 'https://example.com/test-meal.jpg',
        mealTime: new Date().toISOString(),
        mealText: '测试餐食：小米粥、青菜、蒸蛋',
        emotion: '开心'
      };
      
      console.log('云函数调用参数:', testParams);
      
      const result = await AV.Cloud.run('saveMealRecord', testParams);

      wx.hideLoading();
      console.log('saveMealRecord 测试成功:', result);
      
      wx.showModal({
        title: '云函数测试成功 ✅',
        content: `云函数调用成功！\n\n返回结果：\n状态：${result.status}\n记录ID：${result.mealRecordId}\n\n请到 LeanCloud 控制台的 MealRecord 表中查看新增记录。`,
        showCancel: false
      });

    } catch (error) {
      wx.hideLoading();
      console.error('saveMealRecord 测试失败 - 完整错误信息:', error);
      
      wx.showModal({
        title: '云函数测试失败 ❌',
        content: `云函数调用失败！\n错误：${error.message || '未知错误'}\n\n解决方案：\n1. 确保已部署云函数到LeanCloud\n2. 检查云函数代码是否正确\n3. 或者使用客户端直接操作测试`,
        confirmText: '查看部署说明',
        success: (res) => {
          if (res.confirm) {
            this.showDeploymentGuide();
          }
        }
      });
    }
  },

  // 使用客户端直接操作测试
  async testWithDirectOperation() {
    wx.showLoading({ title: '检查状态...' });

    try {
      // 检查用户登录状态
      const currentUser = AV.User.current();
      
      if (!currentUser) {
        wx.hideLoading();
        wx.showModal({
          title: '需要登录',
          content: '测试需要先登录，是否现在去登录？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }
          }
        });
        return;
      }

      // 检查是否有UserProfile
      wx.showLoading({ title: '检查用户档案...' });
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('user', currentUser);
      const userProfile = await profileQuery.first();
      
      if (!userProfile) {
        wx.hideLoading();
        wx.showModal({
          title: '需要完善信息',
          content: '测试前需要先完善个人信息，是否现在去完善？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile-setup/profile-setup'
              });
            }
          }
        });
        return;
      }

      // 客户端直接创建MealRecord
      wx.showLoading({ title: '保存数据...' });
      
      const MealRecord = AV.Object.extend('MealRecord');
      const mealRecord = new MealRecord();
      
      // 设置字段值
      mealRecord.set('userProfile', userProfile);
      mealRecord.set('mealImage', 'https://example.com/test-meal.jpg');
      mealRecord.set('mealTime', new Date());
      mealRecord.set('mealText', '测试餐食：小米粥、青菜、蒸蛋');
      mealRecord.set('emotion', '开心');
      
      // 保存记录
      const savedRecord = await mealRecord.save();

      wx.hideLoading();
      console.log('客户端直接操作成功:', savedRecord);
      
      wx.showModal({
        title: '客户端测试成功 ✅',
        content: `数据保存成功！\n\n记录ID：${savedRecord.id}\n保存时间：${new Date().toLocaleString()}\n\n请到 LeanCloud 控制台的 MealRecord 表中查看新增记录。\n\n注意：这是客户端直接操作，实际应用中建议使用云函数。`,
        showCancel: false
      });

    } catch (error) {
      wx.hideLoading();
      console.error('客户端直接操作失败:', error);
      
      wx.showModal({
        title: '客户端测试失败 ❌',
        content: `数据保存失败！\n错误：${error.message || '未知错误'}\n\n请检查：\n1. 网络连接\n2. LeanCloud配置\n3. 数据表权限设置`,
        showCancel: false
      });
    }
  },

  // 显示部署指南
  showDeploymentGuide() {
    wx.showModal({
      title: '云函数部署指南',
      content: `请按以下步骤部署云函数：\n\n1. 登录 LeanCloud 控制台\n2. 进入 云引擎 → 云函数\n3. 创建新云函数 'saveMealRecord'\n4. 复制 cloud-functions.js 中的代码\n5. 粘贴并部署\n\n详细代码已保存在项目根目录的 cloud-functions.js 文件中。`,
      showCancel: false
    });
  },

  // 测试 getMealRecords 云函数
  async testGetMealRecords() {
    wx.showModal({
      title: '选择查询方式',
      content: '请选择查询方式：\n\n1. 云函数方式（需要先部署）\n2. 客户端直接查询（临时方案）',
      confirmText: '云函数',
      cancelText: '客户端',
      success: async (res) => {
        if (res.confirm) {
          // 使用云函数方式
          await this.queryWithCloudFunction();
        } else {
          // 使用客户端直接查询
          await this.queryWithDirectOperation();
        }
      }
    });
  },

  // 使用云函数方式查询
  async queryWithCloudFunction() {
    wx.showLoading({ title: '检查状态...' });

    try {
      // 检查用户登录状态
      const currentUser = AV.User.current();
      
      if (!currentUser) {
        wx.hideLoading();
        wx.showModal({
          title: '需要登录',
          content: '测试云函数需要先登录，是否现在去登录？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }
          }
        });
        return;
      }

      // 检查是否有UserProfile
      wx.showLoading({ title: '检查用户档案...' });
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('user', currentUser);
      const userProfile = await profileQuery.first();
      
      if (!userProfile) {
        wx.hideLoading();
        wx.showModal({
          title: '需要完善信息',
          content: '查询前需要先完善个人信息，是否现在去完善？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile-setup/profile-setup'
              });
            }
          }
        });
        return;
      }

      // 开始测试云函数
      wx.showLoading({ title: '测试查询...' });
      console.log('开始测试 getMealRecords 云函数，用户ID:', currentUser.id);
      
      const queryParams = {
        userId: currentUser.id,
        limit: 10
      };
      
      console.log('云函数调用参数:', queryParams);
      
      const result = await AV.Cloud.run('getMealRecords', queryParams);

      wx.hideLoading();
      console.log('getMealRecords 测试成功:', result);
      
      const { count, totalCount, records, userProfile: profileData } = result;
      
      let content = `云函数查询成功！\n\n`;
      content += `📊 统计信息：\n`;
      content += `当前返回：${count} 条记录\n`;
      content += `总计：${totalCount} 条记录\n`;
      content += `用户体质：${profileData?.constitution || '未设置'}\n\n`;
      
      if (records && records.length > 0) {
        content += `📝 最近的记录：\n`;
        records.slice(0, 3).forEach((record, index) => {
          const time = new Date(record.mealTime).toLocaleString('zh-CN');
          content += `${index + 1}. ${time}\n   ${record.mealText}\n   情绪：${record.emotion}\n\n`;
        });
      } else {
        content += `📝 暂无餐饮记录\n请先使用 saveMealRecord 添加一些记录。`;
      }
      
      wx.showModal({
        title: '云函数查询成功 ✅',
        content: content,
        showCancel: false
      });

    } catch (error) {
      wx.hideLoading();
      console.error('getMealRecords 测试失败 - 完整错误信息:', error);
      
      wx.showModal({
        title: '云函数查询失败 ❌',
        content: `云函数调用失败！\n错误：${error.message || '未知错误'}\n\n解决方案：\n1. 确保已部署云函数到LeanCloud\n2. 检查云函数代码是否正确\n3. 或者使用客户端直接查询测试`,
        confirmText: '查看部署说明',
        success: (res) => {
          if (res.confirm) {
            this.showDeploymentGuide();
          }
        }
      });
    }
  },

  // 使用客户端直接查询
  async queryWithDirectOperation() {
    wx.showLoading({ title: '检查状态...' });

    try {
      // 检查用户登录状态
      const currentUser = AV.User.current();
      
      if (!currentUser) {
        wx.hideLoading();
        wx.showModal({
          title: '需要登录',
          content: '查询需要先登录，是否现在去登录？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }
          }
        });
        return;
      }

      // 检查是否有UserProfile
      wx.showLoading({ title: '检查用户档案...' });
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('user', currentUser);
      const userProfile = await profileQuery.first();
      
      if (!userProfile) {
        wx.hideLoading();
        wx.showModal({
          title: '需要完善信息',
          content: '查询前需要先完善个人信息，是否现在去完善？',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile-setup/profile-setup'
              });
            }
          }
        });
        return;
      }

      // 客户端直接查询MealRecord
      wx.showLoading({ title: '查询数据...' });
      
      const MealRecord = AV.Object.extend('MealRecord');
      const query = new AV.Query(MealRecord);
      
      // 设置查询条件
      query.equalTo('userProfile', userProfile);
      query.include('userProfile');
      query.descending('mealTime');
      query.limit(10);
      
      // 执行查询
      const records = await query.find();
      const totalCount = await query.count();

      wx.hideLoading();
      console.log('客户端直接查询成功:', records);
      
      let content = `客户端查询成功！\n\n`;
      content += `📊 统计信息：\n`;
      content += `当前返回：${records.length} 条记录\n`;
      content += `总计：${totalCount} 条记录\n`;
      content += `用户体质：${userProfile.get('constitution') || '未设置'}\n\n`;
      
      if (records.length > 0) {
        content += `📝 最近的记录：\n`;
        records.slice(0, 3).forEach((record, index) => {
          const time = record.get('mealTime').toLocaleString('zh-CN');
          content += `${index + 1}. ${time}\n   ${record.get('mealText')}\n   情绪：${record.get('emotion')}\n\n`;
        });
      } else {
        content += `📝 暂无餐饮记录\n请先保存一些餐饮记录。`;
      }
      
      content += `\n注意：这是客户端直接查询，实际应用中建议使用云函数。`;
      
      wx.showModal({
        title: '客户端查询成功 ✅',
        content: content,
        showCancel: false
      });

    } catch (error) {
      wx.hideLoading();
      console.error('客户端直接查询失败:', error);
      
      wx.showModal({
        title: '客户端查询失败 ❌',
        content: `数据查询失败！\n错误：${error.message || '未知错误'}\n\n请检查：\n1. 网络连接\n2. LeanCloud配置\n3. 数据表权限设置`,
        showCancel: false
      });
    }
  },

  // 快速登录测试
  quickLogin() {
    wx.showModal({
      title: '快速登录',
      content: '是否使用测试账号快速登录？\n用户名：test\n密码：123456',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '登录中...' });
          
          try {
            const loginedUser = await AV.User.logIn('test', '123456');
            wx.hideLoading();
            
            this.setData({ userInfo: loginedUser });
            this.loadUserProfile();
            
            wx.showToast({
              title: '登录成功！',
              icon: 'success'
            });
            
            console.log('快速登录成功:', loginedUser.toJSON());
            
          } catch (error) {
            wx.hideLoading();
            console.error('快速登录失败:', error);
            
            if (error.code === 211) {
              // 用户不存在，尝试注册
              this.quickRegister();
            } else {
              wx.showToast({
                title: `登录失败：${error.message}`,
                icon: 'none',
                duration: 3000
              });
            }
          }
        }
      }
    });
  },

  // 快速注册测试用户
  async quickRegister() {
    wx.showModal({
      title: '创建测试账号',
      content: '测试账号不存在，是否创建？\n用户名：test\n密码：123456',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '注册中...' });
          
          try {
            const user = new AV.User();
            user.setUsername('test');
            user.setPassword('123456');
            
            const registeredUser = await user.signUp();
            wx.hideLoading();
            
            this.setData({ userInfo: registeredUser });
            
            wx.showToast({
              title: '注册并登录成功！',
              icon: 'success'
            });
            
            console.log('快速注册成功:', registeredUser.toJSON());
            
            // 提示用户完善信息
            setTimeout(() => {
              wx.showModal({
                title: '完善信息',
                content: '账号创建成功！是否现在完善个人信息？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    this.goToProfile();
                  }
                }
              });
            }, 1500);
            
          } catch (error) {
            wx.hideLoading();
            console.error('快速注册失败:', error);
            
            wx.showToast({
              title: `注册失败：${error.message}`,
              icon: 'none',
              duration: 3000
            });
          }
        }
      }
    });
  },

  // 跳转到个人信息页面
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile-setup/profile-setup'
    });
  }
});
