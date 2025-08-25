// LeanCloud 云函数文件 - cloud.js
// 将此文件上传到云引擎即可自动识别云函数

/**
 * 保存用户餐饮记录云函数
 */
AV.Cloud.define('saveMealRecord', async (request) => {
  const { userId, mealImage, mealTime, mealText, emotion } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空且必须为字符串类型');
    }
    
    if (!mealImage || typeof mealImage !== 'string') {
      throw new AV.Cloud.Error('餐食图片URL不能为空且必须为字符串类型');
    }
    
    if (!mealTime || typeof mealTime !== 'string') {
      throw new AV.Cloud.Error('就餐时间不能为空且必须为字符串类型');
    }
    
    if (!mealText || typeof mealText !== 'string') {
      throw new AV.Cloud.Error('餐食描述不能为空且必须为字符串类型');
    }
    
    if (!emotion || typeof emotion !== 'string') {
      throw new AV.Cloud.Error('情绪关键词不能为空且必须为字符串类型');
    }

    // 创建User指针
    const userPointer = AV.Object.createWithoutData('_User', userId);
    
    // 查询UserProfile表
    const UserProfile = AV.Object.extend('UserProfile');
    const userProfileQuery = new AV.Query(UserProfile);
    userProfileQuery.equalTo('user', userPointer);
    
    const userProfile = await userProfileQuery.first();
    
    if (!userProfile) {
      throw new AV.Cloud.Error('未找到用户档案，请先完善个人信息');
    }
    
    // 验证并转换mealTime为Date对象
    const mealTimeDate = new Date(mealTime);
    if (isNaN(mealTimeDate.getTime())) {
      throw new AV.Cloud.Error('就餐时间格式无效，请使用有效的日期格式');
    }
    
    // 创建MealRecord对象
    const MealRecord = AV.Object.extend('MealRecord');
    const mealRecord = new MealRecord();
    
    // 设置字段值
    mealRecord.set('userProfile', userProfile);
    mealRecord.set('mealImage', mealImage.trim());
    mealRecord.set('mealTime', mealTimeDate);
    mealRecord.set('mealText', mealText.trim());
    mealRecord.set('emotion', emotion.trim());
    
    // 保存MealRecord
    const savedMealRecord = await mealRecord.save();
    
    // 返回成功结果
    return {
      status: 'ok',
      mealRecordId: savedMealRecord.id
    };
    
  } catch (error) {
    console.error('saveMealRecord 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '保存餐饮记录失败');
  }
});

/**
 * 获取用户餐饮记录云函数
 */
AV.Cloud.define('getMealRecords', async (request) => {
  const { userId, limit = 20, skip = 0 } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空且必须为字符串类型');
    }

    // 创建User指针
    const userPointer = AV.Object.createWithoutData('_User', userId);
    
    // 查询UserProfile
    const UserProfile = AV.Object.extend('UserProfile');
    const userProfileQuery = new AV.Query(UserProfile);
    userProfileQuery.equalTo('user', userPointer);
    
    const userProfile = await userProfileQuery.first();
    
    if (!userProfile) {
      throw new AV.Cloud.Error('未找到用户档案');
    }

    // 查询MealRecord
    const MealRecord = AV.Object.extend('MealRecord');
    const mealRecordQuery = new AV.Query(MealRecord);
    
    // 设置查询条件
    mealRecordQuery.equalTo('userProfile', userProfile);
    mealRecordQuery.include('userProfile');
    mealRecordQuery.descending('mealTime');
    mealRecordQuery.limit(Math.min(limit, 100));
    mealRecordQuery.skip(skip);
    
    // 执行查询
    const mealRecords = await mealRecordQuery.find();
    const totalCount = await mealRecordQuery.count();
    
    // 格式化返回数据
    const formattedRecords = mealRecords.map(record => {
      const recordData = record.toJSON();
      
      return {
        mealRecordId: recordData.objectId,
        mealImage: recordData.mealImage,
        mealTime: recordData.mealTime,
        mealText: recordData.mealText,
        emotion: recordData.emotion,
        createdAt: recordData.createdAt,
        updatedAt: recordData.updatedAt,
        userProfile: {
          constitution: recordData.userProfile?.constitution,
          preferences: recordData.userProfile?.preferences,
          medicalHistory: recordData.userProfile?.medicalHistory
        }
      };
    });
    
    // 返回结果
    return {
      status: 'ok',
      count: formattedRecords.length,
      totalCount: totalCount,
      records: formattedRecords,
      userProfile: {
        constitution: userProfile.get('constitution'),
        preferences: userProfile.get('preferences'),
        medicalHistory: userProfile.get('medicalHistory')
      }
    };
    
  } catch (error) {
    console.error('getMealRecords 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '获取餐饮记录失败');
  }
});

/**
 * AI体质分析云函数
 */
AV.Cloud.define('analyzeConstitution', async (request) => {
  const { prompt, userAnswers } = request.params;
  
  try {
    // 参数验证
    if (!prompt || typeof prompt !== 'string') {
      throw new AV.Cloud.Error('分析提示不能为空');
    }

    // 使用默认分析逻辑
    const analysis = getDefaultConstitutionAnalysis(userAnswers);
    
    // 返回分析结果
    return {
      status: 'ok',
      analysis: analysis
    };
    
  } catch (error) {
    console.error('analyzeConstitution 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '体质分析失败');
  }
  
  // 默认体质分析逻辑
  function getDefaultConstitutionAnalysis(userAnswers) {
    const answers = Object.values(userAnswers);
    const avgScore = answers.reduce((sum, score) => sum + parseInt(score), 0) / answers.length;
    
    let constitution, characteristics, suggestions;
    
    if (avgScore <= 1.5) {
      constitution = '气虚体质';
      characteristics = '精力不足，容易疲劳，抵抗力较弱，说话声音较低。';
      suggestions = {
        diet: '多食用补气食物，如人参、黄芪、山药、大枣、桂圆等，避免过于寒凉的食物。',
        lifestyle: '保证充足睡眠，避免过度劳累，适量运动如太极拳、散步等。',
        medical: '定期体检，注意预防感冒，可适当进行中医调理。'
      };
    } else if (avgScore >= 3.5) {
      constitution = '湿热体质';
      characteristics = '容易上火，口干舌燥，情绪较为急躁，可能有皮肤问题。';
      suggestions = {
        diet: '饮食清淡，多食绿豆、冬瓜、苦瓜等清热利湿食物，避免辛辣油腻。',
        lifestyle: '保持心情平和，适度运动排汗，避免熬夜。',
        medical: '注意调节情绪，定期体检，必要时进行中医调理。'
      };
    } else {
      constitution = '平和体质';
      characteristics = '体质较为平衡，身体健康状况良好，适应能力强。';
      suggestions = {
        diet: '保持饮食均衡，适量摄入各类营养，避免偏食。',
        lifestyle: '保持规律作息，适度运动，保持良好心态。',
        medical: '定期体检，预防为主，维持当前良好状态。'
      };
    }
    
    return JSON.stringify({
      constitution,
      characteristics,
      suggestions
    });
  }
});

