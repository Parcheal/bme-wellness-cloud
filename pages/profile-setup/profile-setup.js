// pages/profile-setup/profile-setup.js

const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    currentStep: 0, // 当前步骤
    
    // 基本信息
    basicInfo: {
      name: '',
      age: '',
      gender: '',
      height: '',
      weight: '',
      occupation: ''
    },
    
    // 疾病史
    medicalHistory: {
      chronicDiseases: '', // 慢性疾病
      allergies: '', // 过敏史
      currentMedications: '', // 当前用药
      familyHistory: '' // 家族病史
    },
    
    // 饮食偏好
    dietaryPreferences: {
      spiciness: 3, // 辣度偏好 1-5
      sweetness: 3, // 甜度偏好 1-5
      temperature: 'normal', // 温度偏好：cold/normal/hot
      meatPreference: 'mixed', // 荤素偏好：vegetarian/meat/mixed
      allergicFoods: '', // 过敏食物
      dislikedFoods: '', // 不喜欢的食物
      eatingTime: {
        breakfast: '7:00',
        lunch: '12:00', 
        dinner: '18:00'
      }
    },
    
    // 中医体质测试问卷
    constitutionTest: {
      answers: {}, // 问卷答案
      result: '', // AI分析结果
      constitution: '' // 体质类型
    },
    
    // 体质测试题目
    constitutionQuestions: [
      {
        id: 1,
        question: '您平时精力充沛吗？',
        options: ['很充沛', '比较充沛', '一般', '较疲倦', '很疲倦']
      },
      {
        id: 2,
        question: '您是否容易疲劳？',
        options: ['从不', '很少', '有时', '经常', '总是']
      },
      {
        id: 3,
        question: '您说话声音如何？',
        options: ['声音洪亮', '较洪亮', '一般', '较低沉', '声音很低']
      },
      {
        id: 4,
        question: '您是否容易感冒？',
        options: ['从不', '偶尔', '一般', '经常', '总是']
      },
      {
        id: 5,
        question: '您的睡眠质量如何？',
        options: ['很好', '较好', '一般', '较差', '很差']
      },
      {
        id: 6,
        question: '您是否怕冷？',
        options: ['从不怕冷', '不太怕冷', '一般', '比较怕冷', '很怕冷']
      },
      {
        id: 7,
        question: '您是否怕热？',
        options: ['从不怕热', '不太怕热', '一般', '比较怕热', '很怕热']
      },
      {
        id: 8,
        question: '您的情绪状态通常如何？',
        options: ['很乐观', '比较乐观', '一般', '容易焦虑', '经常抑郁']
      }
    ]
  },

  onLoad() {
    // 页面加载时的初始化
    console.log('个人信息录入页面加载');
  },

  // 填充测试数据
  fillTestData() {
    this.setData({
      basicInfo: {
        name: '测试用户',
        age: '28',
        gender: '女',
        height: '165',
        weight: '55',
        occupation: '软件工程师'
      },
      medicalHistory: {
        chronicDiseases: '无',
        allergies: '无',
        currentMedications: '无',
        familyHistory: '无'
      },
      dietaryPreferences: {
        spiciness: 3,
        sweetness: 2,
        temperature: 'normal',
        meatPreference: 'mixed',
        allergicFoods: '',
        dislikedFoods: '',
        eatingTime: {
          breakfast: '7:30',
          lunch: '12:00',
          dinner: '18:30'
        }
      },
      'constitutionTest.answers': {
        1: 2, // 精力一般
        2: 1, // 很少疲劳
        3: 2, // 声音较洪亮
        4: 1, // 偶尔感冒
        5: 2, // 睡眠较好
        6: 2, // 不太怕冷
        7: 1, // 不太怕热
        8: 2  // 比较乐观
      }
    });

    wx.showToast({
      title: '测试数据已填充',
      icon: 'success'
    });
  },

  // 基本信息输入处理
  onBasicInfoInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`basicInfo.${field}`]: value
    });
  },

  // 性别选择
  onGenderChange(e) {
    this.setData({
      'basicInfo.gender': e.detail.value
    });
  },

  // 疾病史输入
  onMedicalHistoryInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`medicalHistory.${field}`]: value
    });
  },

  // 饮食偏好滑块改变
  onPreferenceSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`dietaryPreferences.${field}`]: value
    });
  },

  // 饮食温度偏好改变
  onTemperatureChange(e) {
    this.setData({
      'dietaryPreferences.temperature': e.detail.value
    });
  },

  // 荤素偏好改变
  onMeatPreferenceChange(e) {
    this.setData({
      'dietaryPreferences.meatPreference': e.detail.value
    });
  },

  // 用餐时间改变
  onEatingTimeChange(e) {
    const { meal } = e.currentTarget.dataset;
    this.setData({
      [`dietaryPreferences.eatingTime.${meal}`]: e.detail.value
    });
  },

  // 体质测试答案选择
  onConstitutionAnswer(e) {
    const { questionId } = e.currentTarget.dataset;
    const answerIndex = e.detail.value;
    
    this.setData({
      [`constitutionTest.answers.${questionId}`]: answerIndex
    });
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep < 3) {
      if (this.validateCurrentStep()) {
        this.setData({
          currentStep: this.data.currentStep + 1
        });
      }
    } else {
      // 最后一步，进行AI体质分析
      this.analyzeConstitution();
    }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  // 验证当前步骤
  validateCurrentStep() {
    const { currentStep } = this.data;
    
    switch (currentStep) {
      case 0: // 基本信息
        const { name, age, gender, height, weight } = this.data.basicInfo;
        if (!name || !age || !gender || !height || !weight) {
          wx.showToast({
            title: '请完善基本信息',
            icon: 'none'
          });
          return false;
        }
        break;
        
      case 1: // 疾病史 - 可以为空，不强制验证
        break;
        
      case 2: // 饮食偏好 - 有默认值，不强制验证
        break;
        
      case 3: // 体质测试
        const answers = this.data.constitutionTest.answers;
        if (Object.keys(answers).length < this.data.constitutionQuestions.length) {
          wx.showToast({
            title: '请完成所有体质测试题目',
            icon: 'none'
          });
          return false;
        }
        break;
    }
    
    return true;
  },

  // AI体质分析
  async analyzeConstitution() {
    wx.showLoading({
      title: '正在分析体质...'
    });

    try {
      // 构建分析数据
      const analysisData = {
        basicInfo: this.data.basicInfo,
        medicalHistory: this.data.medicalHistory,
        dietaryPreferences: this.data.dietaryPreferences,
        constitutionAnswers: this.data.constitutionTest.answers,
        questions: this.data.constitutionQuestions
      };

      // 调用AI分析接口
      const result = await this.callAIAnalysis(analysisData);
      
      // 保存用户档案
      await this.saveUserProfile(result);
      
      wx.hideLoading();
      wx.showToast({
        title: '信息录入成功！',
        icon: 'success'
      });

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/home'
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('体质分析失败:', error);
      wx.showToast({
        title: '分析失败，请重试',
        icon: 'none'
      });
    }
  },

  // 调用AI分析接口
  async callAIAnalysis(data) {
    try {
      // 构建AI分析提示
      const prompt = this.buildAnalysisPrompt(data);
      
      // 使用LeanCloud云函数调用AI分析
      const result = await AV.Cloud.run('analyzeConstitution', {
        prompt: prompt,
        userAnswers: data.constitutionAnswers
      });
      
      return result.analysis || this.getDefaultAnalysis(data);
      
    } catch (error) {
      console.error('AI分析调用失败:', error);
      // 如果AI分析失败，返回默认分析结果
      return this.getDefaultAnalysis(data);
    }
  },

  // 获取默认分析结果（当AI分析失败时）
  getDefaultAnalysis(data) {
    const { basicInfo, constitutionAnswers } = data;
    
    // 基于用户回答进行简单的体质判断
    let constitution = '平和体质';
    let characteristics = '体质较为平衡，身体健康状况良好。';
    let suggestions = '保持规律作息，合理饮食，适度运动，定期体检。';
    
    // 简单的体质判断逻辑
    const answers = Object.values(constitutionAnswers);
    const avgScore = answers.reduce((sum, score) => sum + parseInt(score), 0) / answers.length;
    
    if (avgScore <= 1.5) {
      constitution = '气虚体质';
      characteristics = '容易疲劳，精力不足，抵抗力较弱。';
      suggestions = '注意休息，避免过度劳累，多吃补气食物如人参、黄芪、山药等。';
    } else if (avgScore >= 3.5) {
      constitution = '湿热体质';
      characteristics = '容易上火，口干舌燥，情绪较为急躁。';
      suggestions = '饮食清淡，多喝水，避免辛辣油腻食物，保持心情平和。';
    }
    
    return JSON.stringify({
      constitution,
      characteristics,
      suggestions: {
        diet: suggestions,
        lifestyle: '保持规律作息，适度运动。',
        medical: '定期体检，关注身体变化。'
      }
    });
  },

  // 构建AI分析提示
  buildAnalysisPrompt(data) {
    const { basicInfo, medicalHistory, dietaryPreferences, constitutionAnswers, questions } = data;
    
    let prompt = `请根据以下信息分析用户的中医体质类型：

基本信息：
- 姓名：${basicInfo.name}
- 年龄：${basicInfo.age}岁
- 性别：${basicInfo.gender}
- 身高：${basicInfo.height}cm
- 体重：${basicInfo.weight}kg
- 职业：${basicInfo.occupation}

疾病史：
- 慢性疾病：${medicalHistory.chronicDiseases || '无'}
- 过敏史：${medicalHistory.allergies || '无'}
- 当前用药：${medicalHistory.currentMedications || '无'}
- 家族病史：${medicalHistory.familyHistory || '无'}

饮食偏好：
- 辣度偏好：${dietaryPreferences.spiciness}/5
- 甜度偏好：${dietaryPreferences.sweetness}/5
- 温度偏好：${dietaryPreferences.temperature}
- 荤素偏好：${dietaryPreferences.meatPreference}

体质测试答案：\n`;

    questions.forEach((q, index) => {
      const answer = constitutionAnswers[q.id];
      if (answer !== undefined) {
        prompt += `${q.question} 答案：${q.options[answer]}\n`;
      }
    });

    prompt += `\n请分析该用户的中医体质类型（如气虚体质、阳虚体质、阴虚体质、痰湿体质、湿热体质、血瘀体质、气郁体质、特禀体质、平和体质），并给出：
1. 主要体质类型
2. 体质特点说明
3. 日常养生建议
4. 饮食调理建议
5. 生活作息建议

请用JSON格式返回，包含constitution（体质类型）、characteristics（特点）、suggestions（建议）字段。`;

    return prompt;
  },

  // 保存用户档案
  async saveUserProfile(aiAnalysis) {
    try {
      const currentUser = AV.User.current();
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      // 解析AI分析结果
      let analysisResult;
      try {
        analysisResult = JSON.parse(aiAnalysis);
      } catch (e) {
        // 如果不是JSON格式，则保存原始文本
        analysisResult = {
          constitution: '待分析',
          characteristics: aiAnalysis,
          suggestions: aiAnalysis
        };
      }

      // 检查是否已存在用户档案
      const UserProfile = AV.Object.extend('UserProfile');
      const query = new AV.Query(UserProfile);
      query.equalTo('user', currentUser);
      let profile = await query.first();

      if (!profile) {
        // 创建新的用户档案
        profile = new UserProfile();
      }
      
      // 设置用户档案数据 - 使用 user Pointer 而不是 userId 字符串
      profile.set('user', currentUser); // 这里是关键修改：使用 Pointer 指向 _User
      profile.set('constitution', analysisResult.constitution || '平和体质');
      profile.set('preferences', this.formatPreferences());
      profile.set('medicalHistory', this.formatMedicalHistory());
      
      // 保存其他详细信息
      profile.set('basicInfo', this.data.basicInfo);
      profile.set('dietaryPreferences', this.data.dietaryPreferences);
      profile.set('constitutionTest', this.data.constitutionTest);
      profile.set('constitutionAnalysis', analysisResult);

      // 保存到云端
      await profile.save();
      
      console.log('用户档案保存成功，Profile ID:', profile.id);
      
    } catch (error) {
      console.error('保存用户档案失败:', error);
      throw error;
    }
  },

  // 格式化偏好信息为数组
  formatPreferences() {
    const { dietaryPreferences } = this.data;
    const preferences = [];
    
    if (dietaryPreferences.spiciness <= 2) {
      preferences.push('少辣');
    } else if (dietaryPreferences.spiciness >= 4) {
      preferences.push('嗜辣');
    }
    
    if (dietaryPreferences.sweetness <= 2) {
      preferences.push('少甜');
    } else if (dietaryPreferences.sweetness >= 4) {
      preferences.push('嗜甜');
    }
    
    if (dietaryPreferences.temperature === 'cold') {
      preferences.push('偏冷食');
    } else if (dietaryPreferences.temperature === 'hot') {
      preferences.push('偏热食');
    }
    
    if (dietaryPreferences.meatPreference === 'vegetarian') {
      preferences.push('素食');
    } else if (dietaryPreferences.meatPreference === 'meat') {
      preferences.push('肉食');
    }
    
    return preferences.length > 0 ? preferences : ['饮食均衡'];
  },

  // 格式化疾病史为字符串
  formatMedicalHistory() {
    const { medicalHistory } = this.data;
    const history = [];
    
    if (medicalHistory.chronicDiseases && medicalHistory.chronicDiseases !== '无') {
      history.push(`慢性病：${medicalHistory.chronicDiseases}`);
    }
    
    if (medicalHistory.allergies && medicalHistory.allergies !== '无') {
      history.push(`过敏史：${medicalHistory.allergies}`);
    }
    
    if (medicalHistory.currentMedications && medicalHistory.currentMedications !== '无') {
      history.push(`用药：${medicalHistory.currentMedications}`);
    }
    
    if (medicalHistory.familyHistory && medicalHistory.familyHistory !== '无') {
      history.push(`家族史：${medicalHistory.familyHistory}`);
    }
    
    return history.length > 0 ? history.join('；') : '无特殊疾病史';
  }
});
