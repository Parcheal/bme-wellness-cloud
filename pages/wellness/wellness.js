// pages/wellness/wellness.js

const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    userInput: '', // 用户输入的问题
    reply: '', // AI回复
    isLoading: false, // 是否正在请求
    userProfile: null, // 用户档案
    showUploadButton: false, // 是否显示上传数据按钮
    conversationHistory: [] // 对话历史
  },

  async onLoad() {
    // 加载用户档案
    await this.loadUserProfile();
  },

  onShow() {
    // 页面显示时检查是否有用户档案
    if (!this.data.userProfile) {
      this.loadUserProfile();
    }
  },

  // 加载用户档案
  async loadUserProfile() {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const query = new AV.Query('UserProfile');
      query.equalTo('userId', currentUser.id);
      const profile = await query.first();
      
      if (profile) {
        this.setData({
          userProfile: profile.toJSON(),
          showUploadButton: true
        });
      } else {
        wx.showToast({
          title: '请先完善个人信息',
          icon: 'none'
        });
        
        // 跳转到个人信息录入页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/profile-setup/profile-setup'
          });
        }, 1500);
      }
    } catch (error) {
      console.error('加载用户档案失败:', error);
    }
  },

  // 输入框内容变化
  onInput(e) {
    this.setData({
      userInput: e.detail.value
    });
  },

  // 发送消息给AI
  async sendMessage() {
    const { userInput, userProfile } = this.data;

    // 验证输入
    if (!userInput || userInput.trim() === '') {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }

    // 设置加载状态
    this.setData({
      isLoading: true,
      reply: '正在为您分析...'
    });

    wx.showLoading({
      title: '养生助手思考中...'
    });

    try {
      // 构建包含用户体质信息的提示
      const enhancedPrompt = this.buildWellnessPrompt(userInput, userProfile);
      
      // 调用AI接口
      const response = await this.callWellnessAI(enhancedPrompt);
      
      // 保存对话历史
      const newConversation = {
        question: userInput,
        answer: response,
        timestamp: new Date()
      };
      
      this.setData({
        reply: response,
        isLoading: false,
        userInput: '',
        conversationHistory: [...this.data.conversationHistory, newConversation]
      });

      wx.hideLoading();

    } catch (error) {
      wx.hideLoading();
      console.error('养生咨询失败:', error);
      
      this.setData({
        reply: '咨询失败，请稍后重试。如果问题持续，请检查网络连接。',
        isLoading: false
      });
    }
  },

  // 构建养生助手提示
  buildWellnessPrompt(userQuestion, profile) {
    let prompt = `你是一个专业的中医养生助手，请根据用户的个人信息回答问题。

用户信息：`;

    if (profile && profile.basicInfo) {
      const { basicInfo, constitutionAnalysis, dietaryPreferences } = profile;
      
      prompt += `
- 年龄：${basicInfo.age}岁
- 性别：${basicInfo.gender}
- 身高：${basicInfo.height}cm，体重：${basicInfo.weight}kg`;

      if (constitutionAnalysis && constitutionAnalysis.constitution) {
        prompt += `
- 中医体质：${constitutionAnalysis.constitution}
- 体质特点：${constitutionAnalysis.characteristics}`;
      }

      if (dietaryPreferences) {
        prompt += `
- 饮食偏好：辣度${dietaryPreferences.spiciness}/5，甜度${dietaryPreferences.sweetness}/5
- 温度偏好：${dietaryPreferences.temperature}
- 荤素偏好：${dietaryPreferences.meatPreference}`;
      }
    }

    prompt += `

用户问题：${userQuestion}

请根据用户的体质特点和个人信息，提供个性化的中医养生建议。回答要包括：
1. 针对性的养生建议
2. 饮食调理方案（如有需要）
3. 生活作息建议（如有需要）
4. 注意事项

请用温和、专业的语气回答，避免过于绝对的医疗建议。`;

    return prompt;
  },

  // 调用养生AI接口 - 使用LeanCloud云函数
  async callWellnessAI(prompt) {
    try {
      // 优先使用LeanCloud云函数调用AI
      const result = await AV.Cloud.run('wellnessAI', {
        prompt: prompt,
        userProfile: this.data.userProfile
      });
      
      if (result && result.reply) {
        return result.reply;
      } else {
        throw new Error('AI服务返回格式错误');
      }
      
    } catch (error) {
      console.log('云函数AI调用失败，使用本地AI逻辑:', error);
      
      // 如果云函数失败，使用本地智能回复逻辑
      return this.getLocalAIReply(prompt);
    }
  },

  // 本地智能回复逻辑（备用方案）
  getLocalAIReply(prompt) {
    const { userProfile } = this.data;
    const constitution = userProfile?.constitutionAnalysis?.constitution || '平和体质';
    
    // 基于关键词和体质的简单AI逻辑
    const lowercasePrompt = prompt.toLowerCase();
    
    // 饮食相关问题
    if (lowercasePrompt.includes('吃') || lowercasePrompt.includes('饮食') || lowercasePrompt.includes('食物')) {
      if (constitution.includes('气虚')) {
        return `根据您的${constitution}，建议您：\n\n🍲 饮食调理：\n• 多食用补气食物：人参、黄芪、山药、大枣、桂圆\n• 避免生冷食物，温补为主\n• 适量食用小米粥、羊肉汤等温性食物\n\n⚠️ 注意事项：\n• 避免过度节食\n• 少食辛辣刺激性食物\n• 细嚼慢咽，定时定量`;
      } else if (constitution.includes('湿热')) {
        return `根据您的${constitution}，建议您：\n\n🥬 饮食调理：\n• 多食清热利湿食物：绿豆、冬瓜、苦瓜、薏米\n• 避免辛辣油腻食物\n• 适量食用莲子粥、白萝卜汤等\n\n⚠️ 注意事项：\n• 控制甜食摄入\n• 少喝酒，多喝水\n• 避免暴饮暴食`;
      } else {
        return `根据您的${constitution}，建议您：\n\n🍽️ 饮食原则：\n• 保持饮食均衡，营养搭配合理\n• 适量摄入蛋白质、维生素和矿物质\n• 少食多餐，避免过饱\n\n⚠️ 日常建议：\n• 多吃新鲜蔬菜水果\n• 适量运动促进消化\n• 保持规律的作息时间`;
      }
    }
    
    // 运动相关问题
    if (lowercasePrompt.includes('运动') || lowercasePrompt.includes('锻炼') || lowercasePrompt.includes('健身')) {
      if (constitution.includes('气虚')) {
        return `根据您的${constitution}，推荐的运动方式：\n\n🧘‍♀️ 适宜运动：\n• 太极拳、八段锦等柔和运动\n• 慢走、瑜伽\n• 轻松的游泳\n\n⚠️ 注意事项：\n• 避免剧烈运动\n• 运动后及时休息\n• 运动强度以不感到疲劳为宜`;
      } else if (constitution.includes('湿热')) {
        return `根据您的${constitution}，推荐的运动方式：\n\n🏃‍♀️ 适宜运动：\n• 有氧运动：慢跑、游泳、骑行\n• 适量出汗有助于排湿\n• 瑜伽、普拉提\n\n⚠️ 注意事项：\n• 运动后及时补水\n• 避免在高温环境运动\n• 保持适度，不宜过量`;
      } else {
        return `根据您的${constitution}，推荐的运动方式：\n\n🏃‍♀️ 运动建议：\n• 有氧运动：跑步、游泳、骑行\n• 力量训练：适量的重量训练\n• 柔韧性训练：瑜伽、拉伸\n\n⚠️ 注意事项：\n• 循序渐进，避免运动损伤\n• 运动前充分热身\n• 保持规律的运动习惯`;
      }
    }
    
    // 作息相关问题
    if (lowercasePrompt.includes('睡眠') || lowercasePrompt.includes('作息') || lowercasePrompt.includes('失眠')) {
      return `根据中医养生原理，为您提供睡眠建议：\n\n🌙 睡眠调理：\n• 建议在23点前入睡，保证充足睡眠\n• 睡前1小时避免使用电子设备\n• 保持卧室安静、黑暗、凉爽\n\n🍵 助眠方法：\n• 睡前可喝温牛奶或酸枣仁茶\n• 进行简单的冥想或深呼吸\n• 轻柔的按摩太阳穴和足底\n\n⚠️ 特别提醒：\n• 避免睡前大量进食\n• 保持规律的作息时间\n• 如持续失眠建议咨询医生`;
    }
    
    // 情绪相关问题
    if (lowercasePrompt.includes('情绪') || lowercasePrompt.includes('心情') || lowercasePrompt.includes('压力')) {
      return `根据中医情志理论，为您提供调节建议：\n\n😌 情绪调理：\n• 保持心情平和，避免大喜大悲\n• 适当的宣泄情绪，如与朋友倾诉\n• 培养兴趣爱好，转移注意力\n\n🧘‍♀️ 调节方法：\n• 冥想、正念练习\n• 听舒缓的音乐\n• 户外散步，亲近自然\n\n💡 中医建议：\n• 肝主情志，保持肝气舒畅很重要\n• 可以按摩太冲穴、三阴交穴\n• 适量饮用玫瑰花茶、薄荷茶`;
    }
    
    // 默认回复
    return `感谢您的咨询！根据您的${constitution}，我为您提供以下养生建议：\n\n🌿 总体原则：\n• 根据个人体质调整生活方式\n• 保持规律的作息时间\n• 适量运动，合理饮食\n\n📚 建议您：\n• 多关注自己的身体变化\n• 定期进行体质调理\n• 如有具体问题可以详细咨询\n\n💡 小贴士：您可以询问关于饮食、运动、睡眠、情绪调节等方面的问题，我会根据您的体质给出更具体的建议。`;
  },

  // 清空对话
  clearChat() {
    this.setData({
      userInput: '',
      reply: '',
      conversationHistory: []
    });
    
    wx.showToast({
      title: '已清空对话',
      icon: 'success'
    });
  },

  // 上传周数据报告
  async uploadWeeklyData() {
    wx.showLoading({
      title: '生成报告中...'
    });

    try {
      // 这里应该收集用户一周的饮食和情绪数据
      // 目前先使用模拟数据
      const weeklyData = await this.getWeeklyData();
      
      if (!weeklyData || weeklyData.length === 0) {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '暂无本周饮食情绪数据，请先在首页进行打卡记录。',
          showCancel: false
        });
        return;
      }

      // 生成AI分析报告
      const reportPrompt = this.buildWeeklyReportPrompt(weeklyData);
      const report = await this.callWellnessAI(reportPrompt);
      
      wx.hideLoading();
      
      // 显示报告
      this.showWeeklyReport(report);

    } catch (error) {
      wx.hideLoading();
      console.error('生成周报告失败:', error);
      wx.showToast({
        title: '生成报告失败',
        icon: 'none'
      });
    }
  },

  // 获取一周数据（模拟）
  async getWeeklyData() {
    // 这里应该从数据库获取用户一周的打卡数据
    // 目前返回模拟数据
    return [
      { date: '2025-08-18', mood: 4, meals: ['小米粥', '蒸蛋', '青菜'] },
      { date: '2025-08-19', mood: 3, meals: ['豆浆', '包子', '咸菜'] },
      // ... 更多数据
    ];
  },

  // 构建周报告提示
  buildWeeklyReportPrompt(weeklyData) {
    const { userProfile } = this.data;
    
    let prompt = `请根据用户一周的饮食情绪数据，结合其个人体质信息，生成个性化的健康分析报告。

用户体质：${userProfile?.constitutionAnalysis?.constitution || '未知'}

一周数据：\n`;

    weeklyData.forEach(day => {
      prompt += `${day.date}：情绪评分${day.mood}/5，饮食：${day.meals.join('、')}\n`;
    });

    prompt += `
请分析：
1. 情绪-食物-体质的关联性
2. 饮食结构是否适合用户体质
3. 情绪波动对饮食选择的影响
4. 改善建议和下周养生计划

请生成一份专业而易懂的健康报告。`;

    return prompt;
  },

  // 显示周报告
  showWeeklyReport(report) {
    wx.navigateTo({
      url: `/pages/report/report?content=${encodeURIComponent(report)}`
    });
  },

  // 快捷问题点击
  onQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      userInput: question
    });
  },

  // 跳转到个人信息设置页面
  goToProfileSetup() {
    wx.navigateTo({
      url: '/pages/profile-setup/profile-setup'
    });
  }
});
