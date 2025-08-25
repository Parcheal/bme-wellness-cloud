/**
 * LeanCloud 云引擎入口文件
 * 包含所有云函数定义
 */

// ==================== saveMealRecord 云函数 ====================
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

// ==================== getMealRecords 云函数 ====================
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

// ==================== wellnessAI 云函数 ====================
/**
 * 养生助手AI云函数 - 集成OpenAI API
 */
AV.Cloud.define('wellnessAI', async (request) => {
  const { prompt, userProfile } = request.params;
  
  try {
    // 参数验证
    if (!prompt || typeof prompt !== 'string') {
      throw new AV.Cloud.Error('咨询内容不能为空');
    }

    // 提取用户体质信息
    const constitution = userProfile?.constitutionAnalysis?.constitution || userProfile?.constitution || '平和体质';
    const characteristics = userProfile?.constitutionAnalysis?.characteristics || '';
    const basicInfo = userProfile?.basicInfo || {};
    
    // 构建增强的AI提示
    let systemPrompt = `你是一个专业的中医养生助手，具有丰富的中医理论知识和实践经验。请根据用户的个人信息和体质特点回答问题。

用户信息：
- 体质类型：${constitution}
- 体质特点：${characteristics}`;

    if (basicInfo.age) {
      systemPrompt += `\n- 年龄：${basicInfo.age}岁`;
    }
    if (basicInfo.gender) {
      systemPrompt += `\n- 性别：${basicInfo.gender}`;
    }

    systemPrompt += `

请根据用户的体质特点提供个性化的中医养生建议，要求：
1. 语气温和、专业，富有同理心
2. 结合中医理论，但用通俗易懂的语言
3. 提供具体可操作的建议
4. 避免过于绝对的医疗建议
5. 如涉及严重健康问题，建议咨询专业医师
6. 回答应包含适当的emoji图标，使内容更易读

回答格式要求：
- 使用分段和要点列举
- 包含相关的中医理论解释
- 提供实用的日常操作建议`;

    // 调用OpenAI API
    let reply;
    try {
      reply = await callOpenAI(systemPrompt, prompt);
    } catch (openaiError) {
      console.log('OpenAI API调用失败，使用备用逻辑:', openaiError);
      // 如果OpenAI调用失败，使用本地智能回复逻辑
      reply = generateWellnessReply(prompt, constitution);
    }
    
    // 返回结果
    return {
      status: 'ok',
      reply: reply
    };
    
  } catch (error) {
    console.error('wellnessAI 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '养生咨询失败');
  }
  
  // OpenAI API调用函数
  async function callOpenAI(systemPrompt, userPrompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API返回错误: ${data.error.message}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('OpenAI API返回格式异常');
    }

    return data.choices[0].message.content.trim();
  }
  
  // 本地智能回复逻辑（备用方案）
  function generateWellnessReply(prompt, constitution) {
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
        return `根据您的${constitution}，运动建议：\n\n🧘‍♀️ 适宜运动：\n• 太极拳、八段锦等柔和运动\n• 慢走、瑜伽\n• 轻松的游泳\n\n⚠️ 注意事项：\n• 避免剧烈运动\n• 运动后及时休息\n• 运动强度以不感到疲劳为宜`;
      } else if (constitution.includes('湿热')) {
        return `根据您的${constitution}，运动建议：\n\n🏃‍♀️ 适宜运动：\n• 有氧运动：慢跑、游泳、骑行\n• 适量出汗有助于排湿\n• 瑜伽、普拉提\n\n⚠️ 注意事项：\n• 运动后及时补水\n• 避免在高温环境运动\n• 保持适度，不宜过量`;
      } else {
        return `根据您的${constitution}，运动建议：\n\n🏃‍♀️ 运动建议：\n• 有氧运动：跑步、游泳、骑行\n• 力量训练：适量的重量训练\n• 柔韧性训练：瑜伽、拉伸\n\n⚠️ 注意事项：\n• 循序渐进，避免运动损伤\n• 运动前充分热身\n• 保持规律的运动习惯`;
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
  }
});

// ==================== analyzeMealImage 云函数 ====================
/**
 * 餐食图片分析云函数 - 使用OpenAI视觉API
 */
AV.Cloud.define('analyzeMealImage', async (request) => {
  const { imageUrl, userProfile } = request.params;
  
  try {
    // 参数验证
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new AV.Cloud.Error('图片URL不能为空');
    }

    // 提取用户体质信息
    const constitution = userProfile?.constitutionAnalysis?.constitution || userProfile?.constitution || '平和体质';
    
    // 构建图片分析提示
    const analysisPrompt = `你是一个专业的营养师和中医养生专家。请分析这张餐食图片，并根据用户的体质特点给出建议。

用户体质：${constitution}

请分析图片中的食物，并提供：
1. 识别出的具体食物名称（用逗号分隔）
2. 根据用户体质判断这餐食物是否适合
3. 简短的营养评价和建议

返回格式要求：
- 简洁明了，适合在手机上显示
- 先列出食物名称
- 再给出健康建议`;

    // 调用OpenAI视觉API
    let analysis;
    try {
      analysis = await callOpenAIVision(imageUrl, analysisPrompt);
    } catch (visionError) {
      console.log('OpenAI视觉API调用失败，使用文本分析:', visionError);
      // 如果视觉API失败，使用通用分析
      analysis = getDefaultImageAnalysis(constitution);
    }
    
    // 提取食物列表
    const foodList = extractFoodList(analysis);
    
    // 返回结果
    return {
      status: 'ok',
      analysis: analysis,
      foodList: foodList
    };
    
  } catch (error) {
    console.error('analyzeMealImage 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '图片分析失败');
  }
  
  // OpenAI视觉API调用函数
  async function callOpenAIVision(imageUrl, prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API返回错误: ${data.error.message}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('OpenAI API返回格式异常');
    }

    return data.choices[0].message.content.trim();
  }
  
  // 从分析结果中提取食物列表
  function extractFoodList(analysis) {
    // 简单的文本处理，提取可能的食物名称
    const lines = analysis.split('\n');
    const firstLine = lines[0];
    
    // 如果第一行包含食物名称，提取它们
    if (firstLine.includes('：') || firstLine.includes(':')) {
      const foods = firstLine.split(/：|:/)[1];
      if (foods) {
        return foods.trim();
      }
    }
    
    // 否则返回原始分析的前50个字符
    return analysis.length > 50 ? analysis.substring(0, 50) + '...' : analysis;
  }
  
  // 默认图片分析逻辑（备用方案）
  function getDefaultImageAnalysis(constitution) {
    return `图片已保存，请手动输入餐食内容。

根据您的${constitution}，建议：
• 注意食物的温热性质
• 保持营养均衡
• 适量进食，细嚼慢咽

如需更详细的饮食建议，请在养生助手页面咨询。`;
  }
});

// ==================== analyzeConstitution 云函数 ====================
/**
 * AI体质分析云函数 - 集成OpenAI API
 */
AV.Cloud.define('analyzeConstitution', async (request) => {
  const { prompt, userAnswers } = request.params;
  
  try {
    // 参数验证
    if (!prompt || typeof prompt !== 'string') {
      throw new AV.Cloud.Error('分析提示不能为空');
    }

    if (!userAnswers || typeof userAnswers !== 'object') {
      throw new AV.Cloud.Error('用户答案不能为空');
    }

    // 构建专业的体质分析提示
    const systemPrompt = `你是一位资深的中医体质分析专家，具有丰富的临床经验和深厚的中医理论功底。请根据用户的体质测试答案，进行专业的中医体质分析。

中医体质理论基础：
- 平和体质：阴阳气血调和，体质平衡
- 气虚体质：元气不足，脏腑功能减退
- 阳虚体质：阳气不足，温煦功能减退
- 阴虚体质：阴液亏少，失于滋润
- 痰湿体质：水液内停，痰湿凝聚
- 湿热体质：湿热内蕴，表现为湿热并重
- 血瘀体质：血行不畅，瘀血内阻
- 气郁体质：气机郁滞，情志不畅
- 特禀体质：先天禀赋不足，过敏体质

分析要求：
1. 根据用户答案综合判断主要体质类型（可能有兼夹体质）
2. 详细说明该体质的特点和成因
3. 提供针对性的调养建议
4. 语言专业但通俗易懂
5. 返回标准JSON格式

返回格式：
{
  "constitution": "主要体质类型",
  "characteristics": "体质特点详细描述",
  "suggestions": {
    "diet": "饮食调理建议",
    "lifestyle": "生活起居建议", 
    "medical": "保健调理建议"
  }
}`;

    // 调用OpenAI API进行体质分析
    let analysis;
    try {
      analysis = await callOpenAIForConstitution(systemPrompt, prompt);
    } catch (openaiError) {
      console.log('OpenAI体质分析失败，使用默认逻辑:', openaiError);
      // 如果OpenAI调用失败，使用本地逻辑
      analysis = getDefaultConstitutionAnalysis(userAnswers);
    }
    
    // 返回分析结果
    return {
      status: 'ok',
      analysis: analysis
    };
    
  } catch (error) {
    console.error('analyzeConstitution 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '体质分析失败');
  }
  
  // OpenAI体质分析调用函数
  async function callOpenAIForConstitution(systemPrompt, userPrompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3, // 降低温度，使分析更稳定
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API返回错误: ${data.error.message}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('OpenAI API返回格式异常');
    }

    const content = data.choices[0].message.content.trim();
    
    // 尝试解析JSON，如果失败则返回原始文本
    try {
      JSON.parse(content);
      return content;
    } catch (e) {
      // 如果不是有效JSON，转换为标准格式
      return JSON.stringify({
        constitution: '待进一步分析',
        characteristics: content,
        suggestions: {
          diet: '请咨询专业中医师获得个性化饮食建议',
          lifestyle: '保持规律作息，适度运动',
          medical: '建议定期进行中医体质调理'
        }
      });
    }
  }
  
  // 默认体质分析逻辑（备用方案）
  function getDefaultConstitutionAnalysis(userAnswers) {
    // 基于答案进行简单分析
    const answers = Object.values(userAnswers);
    const avgScore = answers.reduce((sum, score) => sum + parseInt(score), 0) / answers.length;
    
    let constitution, characteristics, suggestions;
    
    if (avgScore <= 1.5) {
      constitution = '气虚体质';
      characteristics = '您表现出气虚体质的特征：精力不足，容易疲劳，抵抗力较弱，说话声音较低。气虚体质是由于元气不足，脏腑功能减退所致，常见于体力劳动过度、久病不愈或先天禀赋不足的人群。';
      suggestions = {
        diet: '多食用补气食物，如人参、黄芪、山药、大枣、桂圆、小米、糯米等。避免过于寒凉的食物如冰镇饮料、生冷瓜果。',
        lifestyle: '保证充足睡眠每日7-8小时，避免过度劳累，适量运动如太极拳、散步、八段锦等柔和运动。',
        medical: '定期体检，注意预防感冒，可适当进行中医调理如艾灸足三里、关元穴等。'
      };
    } else if (avgScore >= 3.5) {
      constitution = '湿热体质';
      characteristics = '您表现出湿热体质的特征：容易上火，口干舌燥，情绪较为急躁，可能有皮肤问题。湿热体质是由于湿邪与热邪相结合，内蕴于脾胃，常见于饮食不节、情志郁结或居住环境湿热的人群。';
      suggestions = {
        diet: '饮食清淡，多食绿豆、冬瓜、苦瓜、薏米、莲子等清热利湿食物。避免辛辣油腻、煎炸烧烤、甜腻食品和酒类。',
        lifestyle: '保持心情平和，适度运动排汗如游泳、慢跑，避免熬夜，保持居住环境通风干燥。',
        medical: '注意调节情绪，定期体检，必要时进行中医调理如推拿、刮痧等，可按摩阴陵泉、丰隆穴。'
      };
    } else {
      constitution = '平和体质';
      characteristics = '您表现出平和体质的特征：体质较为平衡，身体健康状况良好，适应能力强。平和体质是最理想的体质状态，阴阳气血调和，脏腑功能正常，是健康的标志。';
      suggestions = {
        diet: '保持饮食均衡，适量摄入各类营养，五谷杂粮、新鲜蔬果、优质蛋白质合理搭配，避免偏食挑食。',
        lifestyle: '保持规律作息，适度运动如慢跑、游泳、瑜伽等，保持良好心态，顺应四季变化调整生活。',
        medical: '定期体检，预防为主，维持当前良好状态，可适当进行保健按摩和传统养生功法练习。'
      };
    }
    
    return JSON.stringify({
      constitution,
      characteristics,
      suggestions
    });
  }
});

// ==================== dailyWellnessPush 云函数 ====================
/**
 * 每日养生提醒推送云函数
 * 需要配置为定时任务：每天早上8点执行
 */
AV.Cloud.define('dailyWellnessPush', async (request) => {
  try {
    console.log('开始执行每日养生推送任务...');
    
    // 获取当前日期和季节信息
    const today = new Date();
    const season = getCurrentSeason(today);
    const weather = ''; // 可以集成天气API获取实时天气
    
    // 查询所有有效用户
    const userQuery = new AV.Query('_User');
    const users = await userQuery.find();
    
    console.log(`找到 ${users.length} 个用户`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 为每个用户生成个性化推送
    for (const user of users) {
      try {
        await sendPersonalizedPush(user, season, weather);
        successCount++;
      } catch (error) {
        console.error(`用户 ${user.id} 推送失败:`, error);
        failCount++;
      }
    }
    
    console.log(`推送完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    
    // 返回执行结果
    return {
      status: 'ok',
      total: users.length,
      success: successCount,
      failed: failCount,
      executedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('dailyWellnessPush 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '每日推送任务失败');
  }
  
  // 发送个性化推送
  async function sendPersonalizedPush(user, season, weather) {
    try {
      // 获取用户档案
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('user', user);
      const userProfile = await profileQuery.first();
      
      if (!userProfile) {
        console.log(`用户 ${user.id} 没有完善档案，跳过推送`);
        return;
      }
      
      // 获取用户体质信息
      const constitution = userProfile.get('constitution') || '平和体质';
      const basicInfo = userProfile.get('basicInfo') || {};
      
      // 生成个性化推送内容
      const pushContent = await generateWellnessPush(constitution, season, weather, basicInfo);
      
      // 发送推送通知
      const push = new AV.Push();
      push.setQuery(AV.Query.equalTo('_User', user));
      push.setMessage(pushContent.message);
      push.setTitle(pushContent.title);
      
      // 设置推送数据
      push.setData({
        type: 'daily_wellness',
        constitution: constitution,
        season: season,
        content: pushContent.content
      });
      
      await push.send();
      console.log(`用户 ${user.id} (${constitution}) 推送成功`);
      
    } catch (error) {
      console.error(`发送推送失败:`, error);
      throw error;
    }
  }
  
  // 生成个性化推送内容
  async function generateWellnessPush(constitution, season, weather, basicInfo) {
    try {
      // 构建AI提示
      const prompt = `作为专业的中医养生顾问，请为用户生成今日个性化养生提醒。

用户信息：
- 体质：${constitution}
- 季节：${season}
- 年龄：${basicInfo.age || '未知'}
- 性别：${basicInfo.gender || '未知'}

要求：
1. 内容简洁，适合推送通知
2. 针对用户体质和当前季节
3. 提供1-2个具体可行的建议
4. 语气温暖亲切
5. 字数控制在50字以内

格式：直接返回推送内容，无需多余格式`;

      // 调用OpenAI生成个性化内容
      const aiContent = await callOpenAIForPush(prompt);
      
      return {
        title: `${season}养生提醒`,
        message: aiContent,
        content: aiContent
      };
      
    } catch (error) {
      console.log('AI生成推送内容失败，使用默认内容:', error);
      // 使用默认推送内容
      return getDefaultPushContent(constitution, season);
    }
  }
  
  // OpenAI推送内容生成
  async function callOpenAIForPush(prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API返回错误: ${data.error.message}`);
    }

    return data.choices[0].message.content.trim();
  }
  
  // 获取当前季节
  function getCurrentSeason(date) {
    const month = date.getMonth() + 1;
    
    if (month >= 3 && month <= 5) return '春季';
    if (month >= 6 && month <= 8) return '夏季';
    if (month >= 9 && month <= 11) return '秋季';
    return '冬季';
  }
  
  // 默认推送内容
  function getDefaultPushContent(constitution, season) {
    const seasonTips = {
      '春季': {
        '气虚体质': '春季养肝正当时，建议多食用大枣、山药补气养血。',
        '湿热体质': '春季湿气重，多喝绿豆汤，少食辛辣油腻食物。',
        '平和体质': '春季万物生发，适合户外运动，保持心情舒畅。'
      },
      '夏季': {
        '气虚体质': '夏季不宜过度出汗，适量运动，多食用莲子粥。',
        '湿热体质': '夏季清热利湿，多食用冬瓜、苦瓜，避免贪凉。',
        '平和体质': '夏季养心，保持充足睡眠，适量食用清淡食物。'
      },
      '秋季': {
        '气虚体质': '秋季燥气伤肺，多食用银耳、梨润肺补气。',
        '湿热体质': '秋季仍需清热，银耳莲子汤很适合您的体质。',
        '平和体质': '秋季养肺，多做深呼吸，适量食用润燥食物。'
      },
      '冬季': {
        '气虚体质': '冬季补肾养精，羊肉汤、核桃很适合您。',
        '湿热体质': '冬季仍要清淡，可适量温补，避免过度进补。',
        '平和体质': '冬季养肾，早睡晚起，适量进补坚果类食物。'
      }
    };
    
    const tip = seasonTips[season]?.[constitution] || seasonTips[season]?.['平和体质'] || '今日宜保持规律作息，合理饮食。';
    
    return {
      title: `${season}养生提醒`,
      message: tip,
      content: tip
    };
  }
});

// ==================== sendTestPush 云函数 ====================
/**
 * 发送测试推送云函数
 * 用于用户开启推送时发送测试消息
 */
AV.Cloud.define('sendTestPush', async (request) => {
  const { userId } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空');
    }

    // 创建User指针
    const userPointer = AV.Object.createWithoutData('_User', userId);
    
    // 获取用户档案
    const UserProfile = AV.Object.extend('UserProfile');
    const profileQuery = new AV.Query(UserProfile);
    profileQuery.equalTo('user', userPointer);
    const userProfile = await profileQuery.first();
    
    const constitution = userProfile?.get('constitution') || '平和体质';
    
    // 构建测试推送内容
    const testMessage = `欢迎使用养生提醒功能！🌟\n\n根据您的${constitution}，我们每天会为您推送个性化的养生建议。祝您身体健康！`;
    
    // 发送推送通知
    const push = new AV.Push();
    push.setQuery(AV.Query.equalTo('_User', userPointer));
    push.setMessage(testMessage);
    push.setTitle('养生助手欢迎您');
    
    // 设置推送数据
    push.setData({
      type: 'test_push',
      constitution: constitution,
      content: testMessage
    });
    
    await push.send();
    console.log(`测试推送发送成功，用户ID: ${userId}`);
    
    // 返回结果
    return {
      status: 'ok',
      message: '测试推送发送成功'
    };
    
  } catch (error) {
    console.error('sendTestPush 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '测试推送发送失败');
  }
});

// ==================== generateHealthReport 云函数 ====================
/**
 * 生成健康分析报告云函数
 * 分析用户的饮食健康数据并生成报告
 */
AV.Cloud.define('generateHealthReport', async (request) => {
  const { userId, reportType = 'weekly', startDate, endDate } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空');
    }

    // 创建User指针
    const userPointer = AV.Object.createWithoutData('_User', userId);
    
    // 获取用户档案
    const UserProfile = AV.Object.extend('UserProfile');
    const profileQuery = new AV.Query(UserProfile);
    profileQuery.equalTo('user', userPointer);
    const userProfile = await profileQuery.first();
    
    if (!userProfile) {
      throw new AV.Cloud.Error('未找到用户档案');
    }

    // 获取时间范围
    const dateRange = getDateRange(reportType, startDate, endDate);
    
    // 查询餐饮记录
    const mealRecords = await getMealRecordsInRange(userProfile, dateRange);
    
    // 查询日常记录
    const dailyRecords = await getDailyRecordsInRange(userId, dateRange);
    
    // 分析数据
    const analysisData = analyzeHealthData(mealRecords, dailyRecords);
    
    // 生成AI分析报告
    const aiReport = await generateAIReport(userProfile, analysisData, reportType);
    
    // 构建完整报告
    const healthReport = {
      reportType,
      dateRange,
      userProfile: {
        constitution: userProfile.get('constitution'),
        basicInfo: userProfile.get('basicInfo')
      },
      statistics: analysisData,
      aiAnalysis: aiReport,
      generatedAt: new Date().toISOString()
    };
    
    // 保存报告到数据库
    await saveHealthReport(userId, healthReport);
    
    // 返回结果
    return {
      status: 'ok',
      report: healthReport
    };
    
  } catch (error) {
    console.error('generateHealthReport 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '生成健康报告失败');
  }
  
  // 获取时间范围
  function getDateRange(reportType, startDate, endDate) {
    const now = new Date();
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (reportType) {
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'monthly':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'quarterly':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
      }
    }
    
    return { start, end };
  }
  
  // 查询时间范围内的餐饮记录
  async function getMealRecordsInRange(userProfile, dateRange) {
    const MealRecord = AV.Object.extend('MealRecord');
    const query = new AV.Query(MealRecord);
    
    query.equalTo('userProfile', userProfile);
    query.greaterThanOrEqualTo('mealTime', dateRange.start);
    query.lessThanOrEqualTo('mealTime', dateRange.end);
    query.descending('mealTime');
    query.limit(1000);
    
    const records = await query.find();
    return records.map(record => record.toJSON());
  }
  
  // 查询时间范围内的日常记录
  async function getDailyRecordsInRange(userId, dateRange) {
    const query = new AV.Query('DailyRecord');
    query.equalTo('userId', userId);
    
    // 转换日期为字符串格式进行查询
    const startDateStr = dateRange.start.toISOString().split('T')[0];
    const endDateStr = dateRange.end.toISOString().split('T')[0];
    
    query.greaterThanOrEqualTo('date', startDateStr);
    query.lessThanOrEqualTo('date', endDateStr);
    query.descending('date');
    query.limit(1000);
    
    const records = await query.find();
    return records.map(record => record.toJSON());
  }
  
  // 分析健康数据
  function analyzeHealthData(mealRecords, dailyRecords) {
    const analysis = {
      totalMeals: mealRecords.length,
      averageMoodScore: 0,
      moodDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      dailyStats: {},
      foodFrequency: {},
      emotionTrends: [],
      healthScore: 0
    };
    
    // 分析餐饮记录
    let totalMoodScore = 0;
    mealRecords.forEach(record => {
      // 统计情绪分布
      const emotion = record.emotion;
      const moodScore = getMoodScoreFromEmotion(emotion);
      if (moodScore >= 1 && moodScore <= 5) {
        analysis.moodDistribution[moodScore]++;
        totalMoodScore += moodScore;
      }
      
      // 统计食物频率
      if (record.mealText) {
        const foods = record.mealText.split(/[，,、]/);
        foods.forEach(food => {
          const cleanFood = food.trim();
          if (cleanFood) {
            analysis.foodFrequency[cleanFood] = (analysis.foodFrequency[cleanFood] || 0) + 1;
          }
        });
      }
      
      // 按日期统计
      const dateKey = record.mealTime.split('T')[0];
      if (!analysis.dailyStats[dateKey]) {
        analysis.dailyStats[dateKey] = { meals: 0, avgMood: 0, totalMood: 0 };
      }
      analysis.dailyStats[dateKey].meals++;
      analysis.dailyStats[dateKey].totalMood += moodScore;
      analysis.dailyStats[dateKey].avgMood = analysis.dailyStats[dateKey].totalMood / analysis.dailyStats[dateKey].meals;
    });
    
    // 计算平均情绪分数
    if (mealRecords.length > 0) {
      analysis.averageMoodScore = (totalMoodScore / mealRecords.length).toFixed(1);
    }
    
    // 分析日常记录
    let healthyMealsCount = 0;
    let totalDailyMeals = 0;
    
    dailyRecords.forEach(record => {
      if (record.meals) {
        Object.values(record.meals).forEach(meal => {
          if (meal.completed) {
            totalDailyMeals++;
            if (meal.healthy) {
              healthyMealsCount++;
            }
          }
        });
      }
    });
    
    // 计算健康评分
    const healthyRatio = totalDailyMeals > 0 ? healthyMealsCount / totalDailyMeals : 0;
    const moodFactor = analysis.averageMoodScore / 5;
    analysis.healthScore = Math.round((healthyRatio * 0.6 + moodFactor * 0.4) * 100);
    
    return analysis;
  }
  
  // 从情绪文本获取分数
  function getMoodScoreFromEmotion(emotion) {
    const emotionMap = {
      '很沮丧': 1,
      '有点难过': 2,
      '一般': 3,
      '开心': 4,
      '非常开心': 5
    };
    return emotionMap[emotion] || 3;
  }
  
  // 生成AI分析报告
  async function generateAIReport(userProfile, analysisData, reportType) {
    try {
      const constitution = userProfile.get('constitution') || '平和体质';
      const basicInfo = userProfile.get('basicInfo') || {};
      
      const prompt = `作为专业的中医养生专家，请根据用户的健康数据分析生成个性化的健康报告。

用户信息：
- 体质：${constitution}
- 年龄：${basicInfo.age || '未知'}
- 性别：${basicInfo.gender || '未知'}

数据分析结果：
- 报告周期：${reportType === 'weekly' ? '一周' : reportType === 'monthly' ? '一个月' : '三个月'}
- 总餐饮记录：${analysisData.totalMeals}条
- 平均情绪评分：${analysisData.averageMoodScore}/5
- 健康评分：${analysisData.healthScore}/100
- 最常吃的食物：${Object.keys(analysisData.foodFrequency).slice(0, 5).join('、')}

请生成一份专业的健康分析报告，包括：
1. 总体健康状况评价
2. 饮食习惯分析
3. 情绪健康分析
4. 根据体质的个性化建议
5. 改进建议

要求：
- 语言专业但通俗易懂
- 结合中医理论
- 提供具体可行的建议
- 控制在400字以内`;

      // 调用OpenAI生成报告
      const aiContent = await callOpenAIForReport(prompt);
      
      return aiContent;
      
    } catch (error) {
      console.log('AI报告生成失败，使用默认分析:', error);
      return getDefaultReport(userProfile, analysisData, reportType);
    }
  }
  
  // OpenAI报告生成
  async function callOpenAIForReport(prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.chatanywhere.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-V1XEmhuoCFmxGrrQqrVK3gLhPOfY0xQ8rg6ySx2HiC6jME9b'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI API返回错误: ${data.error.message}`);
    }

    return data.choices[0].message.content.trim();
  }
  
  // 默认报告生成
  function getDefaultReport(userProfile, analysisData, reportType) {
    const constitution = userProfile.get('constitution') || '平和体质';
    const periodText = reportType === 'weekly' ? '本周' : reportType === 'monthly' ? '本月' : '本季度';
    
    let report = `${periodText}健康分析报告\n\n`;
    
    // 总体评价
    if (analysisData.healthScore >= 80) {
      report += `📊 总体状况：优秀\n您的${periodText}健康状况非常好，继续保持！`;
    } else if (analysisData.healthScore >= 60) {
      report += `📊 总体状况：良好\n您的${periodText}健康状况良好，还有提升空间。`;
    } else {
      report += `📊 总体状况：需要改善\n您的${periodText}健康状况需要更多关注和调理。`;
    }
    
    report += `\n\n🍽️ 饮食分析：\n共记录${analysisData.totalMeals}次用餐，平均情绪评分${analysisData.averageMoodScore}/5。`;
    
    // 根据体质给建议
    report += `\n\n💡 ${constitution}调理建议：\n`;
    if (constitution.includes('气虚')) {
      report += '注意补气食物摄入，避免过度劳累，保证充足睡眠。';
    } else if (constitution.includes('湿热')) {
      report += '饮食清淡，多食清热利湿食物，保持适量运动。';
    } else {
      report += '保持饮食均衡，适度运动，规律作息。';
    }
    
    return report;
  }
  
  // 保存健康报告
  async function saveHealthReport(userId, reportData) {
    const HealthReport = AV.Object.extend('HealthReport');
    const report = new HealthReport();
    
    report.set('userId', userId);
    report.set('reportType', reportData.reportType);
    report.set('dateRange', reportData.dateRange);
    report.set('statistics', reportData.statistics);
    report.set('aiAnalysis', reportData.aiAnalysis);
    report.set('healthScore', reportData.statistics.healthScore);
    
    await report.save();
    console.log(`健康报告已保存，用户ID: ${userId}`);
  }
});

// ==================== shareWellnessPost 云函数 ====================
/**
 * 分享养生动态云函数
 * 用户可以分享健康餐、养生心得等
 */
AV.Cloud.define('shareWellnessPost', async (request) => {
  const { userId, content, images = [], tags = [], mealRecordId, postType = 'general' } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空');
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new AV.Cloud.Error('分享内容不能为空');
    }

    // 创建User指针
    const userPointer = AV.Object.createWithoutData('_User', userId);
    
    // 获取用户档案
    const UserProfile = AV.Object.extend('UserProfile');
    const profileQuery = new AV.Query(UserProfile);
    profileQuery.equalTo('user', userPointer);
    const userProfile = await profileQuery.first();
    
    if (!userProfile) {
      throw new AV.Cloud.Error('未找到用户档案');
    }

    // 创建分享动态
    const WellnessPost = AV.Object.extend('WellnessPost');
    const post = new WellnessPost();
    
    post.set('author', userPointer);
    post.set('authorProfile', userProfile);
    post.set('content', content.trim());
    post.set('images', images);
    post.set('tags', tags);
    post.set('postType', postType);
    post.set('likes', 0);
    post.set('comments', 0);
    post.set('shares', 0);
    post.set('status', 'active');
    
    // 如果关联了餐饮记录
    if (mealRecordId) {
      const mealRecord = AV.Object.createWithoutData('MealRecord', mealRecordId);
      post.set('mealRecord', mealRecord);
    }

    // 保存动态
    const savedPost = await post.save();
    
    // 更新用户统计
    await updateUserSocialStats(userProfile, 'posts', 1);
    
    // 返回结果
    return {
      status: 'ok',
      postId: savedPost.id,
      message: '分享成功'
    };
    
  } catch (error) {
    console.error('shareWellnessPost 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '分享失败');
  }
});

// ==================== getWellnessFeed 云函数 ====================
/**
 * 获取养生动态流云函数
 * 获取用户的动态流，支持分页和筛选
 */
AV.Cloud.define('getWellnessFeed', async (request) => {
  const { userId, limit = 20, skip = 0, feedType = 'all', constitution = '' } = request.params;
  
  try {
    // 参数验证
    if (!userId || typeof userId !== 'string') {
      throw new AV.Cloud.Error('用户ID不能为空');
    }

    // 查询动态
    const WellnessPost = AV.Object.extend('WellnessPost');
    const query = new AV.Query(WellnessPost);
    
    // 包含关联数据
    query.include(['author', 'authorProfile', 'mealRecord']);
    query.equalTo('status', 'active');
    query.descending('createdAt');
    query.limit(Math.min(limit, 50));
    query.skip(skip);
    
    // 根据动态类型筛选
    if (feedType !== 'all') {
      query.equalTo('postType', feedType);
    }
    
    // 根据体质筛选（如果指定）
    if (constitution) {
      const UserProfile = AV.Object.extend('UserProfile');
      const profileQuery = new AV.Query(UserProfile);
      profileQuery.equalTo('constitution', constitution);
      query.matchesQuery('authorProfile', profileQuery);
    }
    
    // 执行查询
    const posts = await query.find();
    
    // 格式化返回数据
    const formattedPosts = await Promise.all(posts.map(async (post) => {
      const postData = post.toJSON();
      
      // 检查当前用户是否点赞了这个动态
      const isLiked = await checkUserLiked(userId, post.id);
      
      return {
        postId: postData.objectId,
        content: postData.content,
        images: postData.images || [],
        tags: postData.tags || [],
        postType: postData.postType,
        likes: postData.likes || 0,
        comments: postData.comments || 0,
        shares: postData.shares || 0,
        isLiked: isLiked,
        createdAt: postData.createdAt,
        author: {
          userId: postData.author?.objectId,
          name: postData.authorProfile?.basicInfo?.name || '匿名用户',
          constitution: postData.authorProfile?.constitution || '平和体质'
        },
        mealRecord: postData.mealRecord ? {
          mealText: postData.mealRecord.mealText,
          emotion: postData.mealRecord.emotion
        } : null
      };
    }));
    
    // 返回结果
    return {
      status: 'ok',
      posts: formattedPosts,
      hasMore: posts.length === limit
    };
    
  } catch (error) {
    console.error('getWellnessFeed 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '获取动态流失败');
  }
  
  // 检查用户是否点赞
  async function checkUserLiked(userId, postId) {
    try {
      const LikeRecord = AV.Object.extend('LikeRecord');
      const likeQuery = new AV.Query(LikeRecord);
      likeQuery.equalTo('userId', userId);
      likeQuery.equalTo('postId', postId);
      const like = await likeQuery.first();
      return !!like;
    } catch (error) {
      return false;
    }
  }
});

// ==================== likeWellnessPost 云函数 ====================
/**
 * 点赞/取消点赞动态云函数
 */
AV.Cloud.define('likeWellnessPost', async (request) => {
  const { userId, postId, action = 'like' } = request.params;
  
  try {
    // 参数验证
    if (!userId || !postId) {
      throw new AV.Cloud.Error('用户ID和动态ID不能为空');
    }

    const LikeRecord = AV.Object.extend('LikeRecord');
    const likeQuery = new AV.Query(LikeRecord);
    likeQuery.equalTo('userId', userId);
    likeQuery.equalTo('postId', postId);
    const existingLike = await likeQuery.first();
    
    const WellnessPost = AV.Object.extend('WellnessPost');
    const post = await new AV.Query(WellnessPost).get(postId);
    
    if (!post) {
      throw new AV.Cloud.Error('动态不存在');
    }
    
    let currentLikes = post.get('likes') || 0;
    
    if (action === 'like' && !existingLike) {
      // 点赞
      const likeRecord = new LikeRecord();
      likeRecord.set('userId', userId);
      likeRecord.set('postId', postId);
      await likeRecord.save();
      
      post.set('likes', currentLikes + 1);
      await post.save();
      
      return {
        status: 'ok',
        action: 'liked',
        likes: currentLikes + 1
      };
      
    } else if (action === 'unlike' && existingLike) {
      // 取消点赞
      await existingLike.destroy();
      
      post.set('likes', Math.max(0, currentLikes - 1));
      await post.save();
      
      return {
        status: 'ok',
        action: 'unliked',
        likes: Math.max(0, currentLikes - 1)
      };
    }
    
    return {
      status: 'ok',
      action: 'no_change',
      likes: currentLikes
    };
    
  } catch (error) {
    console.error('likeWellnessPost 云函数错误:', error);
    throw new AV.Cloud.Error(error.message || '点赞操作失败');
  }
});

// ==================== 辅助函数 ====================
/**
 * 更新用户社交统计
 */
async function updateUserSocialStats(userProfile, statType, increment) {
  try {
    const currentStats = userProfile.get('socialStats') || {};
    currentStats[statType] = (currentStats[statType] || 0) + increment;
    userProfile.set('socialStats', currentStats);
    await userProfile.save();
  } catch (error) {
    console.error('更新用户统计失败:', error);
  }
}

module.exports = AV.Cloud;
