const express = require('express');
const OpenAI = require('openai');

// 检查是否为本地开发环境
const isLocalDev = !process.env.LEANCLOUD_APP_ID;

let AV = null;
// 只在生产环境中初始化 LeanEngine
if (!isLocalDev) {
  AV = require('leanengine');
  AV.init({
    appId: process.env.LEANCLOUD_APP_ID,
    appKey: process.env.LEANCLOUD_APP_KEY,
    masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
  });
}

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.CHATANYWHERE_API_KEY, // 使用环境变量
  baseURL: 'https://api.chatanywhere.tech/v1' // ChatAnywhere API Base URL
});

const app = express();

// 中间件
app.use(express.json());

// 设置 LeanEngine 中间件（仅在生产环境）
if (!isLocalDev && AV) {
  app.use(AV.express());
}

// 健康检查接口
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '微信小程序AI Agent服务运行中',
    timestamp: new Date().toISOString()
  });
});

// AI Agent 接口
app.post('/agent', async (req, res) => {
  try {
    // 获取用户输入消息
    const { message } = req.body;
    
    // 验证输入
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        error: '请提供有效的消息内容'
      });
    }

    // 检查API密钥是否配置
    if (!process.env.CHATANYWHERE_API_KEY) {
      return res.status(500).json({
        error: '服务器配置错误：未设置API密钥'
      });
    }

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个适合我项目的微信小程序智能Agent，负责根据用户输入给出简洁实用的回答'
        },
        {
          role: 'user', 
          content: message.trim()
        }
      ],
      max_tokens: 500, // 限制回复长度
      temperature: 0.7 // 设置回复的创造性
    });

    // 获取AI回复
    const reply = completion.choices[0]?.message?.content || '抱歉，无法生成回复';

    // 返回成功结果
    res.json({
      reply: reply.trim()
    });

  } catch (error) {
    console.error('AI Agent 错误:', error);

    // 处理不同类型的错误
    let errorMessage = '服务暂时不可用，请稍后重试';
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'API配额不足，请联系管理员';
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'API密钥无效，请联系管理员';
    } else if (error.message) {
      errorMessage = error.message;
    }

    // 返回错误信息
    res.status(500).json({
      error: errorMessage
    });
  }
});

// LeanCloud 云函数定义（仅在生产环境）
if (!isLocalDev && AV) {
  /**
   * 保存用户餐饮记录云函数
   * @param {Object} request - 请求对象
   * @param {string} request.params.userId - 用户ID (_User表的objectId)
   * @param {string} request.params.mealImage - 餐食图片URL
   * @param {string} request.params.mealTime - 就餐时间 (ISO日期字符串)
   * @param {string} request.params.mealText - 餐食描述
   * @param {string} request.params.emotion - 情绪关键词
   * @returns {Object} - 返回保存结果
   */
  AV.Cloud.define('saveMealRecord', async (request) => {
    const { userId, mealImage, mealTime, mealText, emotion } = request.params;
    
    try {
      // 参数验证
      if (!userId || typeof userId !== 'string') {
        throw new Error('用户ID不能为空且必须为字符串类型');
      }
      
      if (!mealImage || typeof mealImage !== 'string') {
        throw new Error('餐食图片URL不能为空且必须为字符串类型');
      }
      
      if (!mealTime || typeof mealTime !== 'string') {
        throw new Error('就餐时间不能为空且必须为字符串类型');
      }
      
      if (!mealText || typeof mealText !== 'string') {
        throw new Error('餐食描述不能为空且必须为字符串类型');
      }
      
      if (!emotion || typeof emotion !== 'string') {
        throw new Error('情绪关键词不能为空且必须为字符串类型');
      }

      // 创建User指针
      const userPointer = AV.Object.createWithoutData('_User', userId);
      
      // 查询UserProfile表，找到user字段指向该userId的档案
      const UserProfile = AV.Object.extend('UserProfile');
      const userProfileQuery = new AV.Query(UserProfile);
      userProfileQuery.equalTo('user', userPointer);
      
      const userProfile = await userProfileQuery.first();
      
      if (!userProfile) {
        throw new Error('未找到用户档案，请先完善个人信息');
      }
      
      // 验证并转换mealTime为Date对象
      const mealTimeDate = new Date(mealTime);
      if (isNaN(mealTimeDate.getTime())) {
        throw new Error('就餐时间格式无效，请使用有效的日期格式');
      }
      
      // 创建MealRecord对象
      const MealRecord = AV.Object.extend('MealRecord');
      const mealRecord = new MealRecord();
      
      // 设置字段值
      mealRecord.set('userProfile', userProfile); // 指向UserProfile的指针
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
      // 重新抛出错误，让LeanCloud处理
      throw new Error(error.message || '保存餐饮记录失败');
    }
  });

  /**
   * 获取用户餐饮记录云函数
   * @param {Object} request - 请求对象
   * @param {string} request.params.userId - 用户ID (_User表的objectId)
   * @param {number} request.params.limit - 限制返回数量（可选，默认20）
   * @param {number} request.params.skip - 跳过条数（可选，默认0，用于分页）
   * @returns {Object} - 返回餐饮记录列表
   */
  AV.Cloud.define('getMealRecords', async (request) => {
    const { userId, limit = 20, skip = 0 } = request.params;
    
    try {
      // 参数验证
      if (!userId || typeof userId !== 'string') {
        throw new Error('用户ID不能为空且必须为字符串类型');
      }

      // 创建User指针
      const userPointer = AV.Object.createWithoutData('_User', userId);
      
      // 查询UserProfile
      const UserProfile = AV.Object.extend('UserProfile');
      const userProfileQuery = new AV.Query(UserProfile);
      userProfileQuery.equalTo('user', userPointer);
      
      const userProfile = await userProfileQuery.first();
      
      if (!userProfile) {
        throw new Error('未找到用户档案');
      }

      // 查询MealRecord
      const MealRecord = AV.Object.extend('MealRecord');
      const mealRecordQuery = new AV.Query(MealRecord);
      
      // 设置查询条件
      mealRecordQuery.equalTo('userProfile', userProfile);
      mealRecordQuery.include('userProfile'); // 包含UserProfile数据
      mealRecordQuery.descending('mealTime'); // 按时间倒序
      mealRecordQuery.limit(Math.min(limit, 100)); // 限制最大100条
      mealRecordQuery.skip(skip);
      
      // 执行查询
      const mealRecords = await mealRecordQuery.find();
      
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
        totalCount: await mealRecordQuery.count(), // 总数（用于分页）
        records: formattedRecords,
        userProfile: {
          constitution: userProfile.get('constitution'),
          preferences: userProfile.get('preferences'),
          medicalHistory: userProfile.get('medicalHistory')
        }
      };
      
    } catch (error) {
      console.error('getMealRecords 云函数错误:', error);
      throw new Error(error.message || '获取餐饮记录失败');
    }
  });

  /**
   * AI体质分析云函数
   * @param {Object} request - 请求对象
   * @param {string} request.params.prompt - AI分析提示
   * @param {Object} request.params.userAnswers - 用户答案
   * @returns {Object} - 返回分析结果
   */
  AV.Cloud.define('analyzeConstitution', async (request) => {
    const { prompt, userAnswers } = request.params;
    
    try {
      // 参数验证
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('分析提示不能为空');
      }

      // 这里可以调用外部AI服务，但为了确保功能可用，我们提供默认分析
      let analysis;
      
      try {
        // 尝试调用AI服务（可选）
        // 如果有配置OpenAI API，可以在这里调用
        analysis = await performAIAnalysis(prompt, userAnswers);
      } catch (aiError) {
        console.log('AI服务调用失败，使用默认分析:', aiError.message);
        // 使用默认分析逻辑
        analysis = getDefaultConstitutionAnalysis(userAnswers);
      }
      
      // 返回分析结果
      return {
        status: 'ok',
        analysis: analysis
      };
      
    } catch (error) {
      console.error('analyzeConstitution 云函数错误:', error);
      throw new Error(error.message || '体质分析失败');
    }
  });

  // AI分析函数（可选，如果OpenAI可用）
  async function performAIAnalysis(prompt, userAnswers) {
    if (!process.env.CHATANYWHERE_API_KEY) {
      throw new Error('AI服务未配置');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的中医体质分析师，请根据用户提供的信息进行中医体质分析。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      throw new Error('AI分析返回为空');
    }

    return reply;
  }

  // 默认体质分析逻辑
  function getDefaultConstitutionAnalysis(userAnswers) {
    // 基于答案进行简单分析
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
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    error: '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error('服务器启动失败:', err);
  } else {
    console.log('🚀 微信小程序AI Agent服务已启动');
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`📅 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  }
});

module.exports = app;
