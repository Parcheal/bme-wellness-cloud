// pages/social/social.js

const AV = require('../../libs/av-core-min.js');

Page({
  data: {
    userInfo: null,
    userProfile: null,
    posts: [], // 动态列表
    loading: false,
    hasMore: true,
    skip: 0,
    limit: 20,
    currentFilter: 'all', // 当前筛选类型
    showShareDialog: false, // 显示分享弹窗
    shareContent: '', // 分享内容
    shareImages: [], // 分享图片
    shareTags: [], // 分享标签
    refreshing: false // 下拉刷新状态
  },

  onLoad() {
    this.checkUserStatus();
    this.loadWellnessFeed();
  },

  onShow() {
    this.checkUserStatus();
    // 如果用户状态改变，重新加载动态
    if (this.data.userInfo) {
      this.refreshFeed();
    }
  },

  // 检查用户状态
  checkUserStatus() {
    const currentUser = AV.User.current();
    if (currentUser) {
      this.setData({ userInfo: currentUser });
      this.loadUserProfile();
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/personal/personal'
        });
      }, 1500);
    }
  },

  // 加载用户档案
  async loadUserProfile() {
    try {
      const currentUser = AV.User.current();
      const UserProfile = AV.Object.extend('UserProfile');
      const query = new AV.Query(UserProfile);
      query.equalTo('user', currentUser);
      const profile = await query.first();
      
      if (profile) {
        this.setData({ userProfile: profile.toJSON() });
      }
    } catch (error) {
      console.error('加载用户档案失败:', error);
    }
  },

  // 加载养生动态流
  async loadWellnessFeed(isRefresh = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const currentUser = AV.User.current();
      if (!currentUser) return;

      const skip = isRefresh ? 0 : this.data.skip;
      
      const result = await AV.Cloud.run('getWellnessFeed', {
        userId: currentUser.id,
        limit: this.data.limit,
        skip: skip,
        feedType: this.data.currentFilter
      });

      if (result && result.posts) {
        let newPosts;
        if (isRefresh) {
          newPosts = result.posts;
        } else {
          newPosts = [...this.data.posts, ...result.posts];
        }

        this.setData({
          posts: newPosts,
          hasMore: result.hasMore,
          skip: isRefresh ? this.data.limit : this.data.skip + this.data.limit
        });
      }

    } catch (error) {
      console.error('加载动态流失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.refreshFeed();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadWellnessFeed();
    }
  },

  // 刷新动态流
  async refreshFeed() {
    this.setData({ skip: 0 });
    await this.loadWellnessFeed(true);
  },

  // 切换筛选类型
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    if (filter !== this.data.currentFilter) {
      this.setData({ 
        currentFilter: filter,
        posts: [],
        skip: 0,
        hasMore: true
      });
      this.loadWellnessFeed(true);
    }
  },

  // 显示分享弹窗
  showShareDialog() {
    const { userProfile } = this.data;
    
    if (!userProfile) {
      wx.showModal({
        title: '提示',
        content: '请先完善个人信息才能发布动态',
        confirmText: '去完善',
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

    this.setData({ 
      showShareDialog: true,
      shareContent: '',
      shareImages: [],
      shareTags: []
    });
  },

  // 关闭分享弹窗
  closeShareDialog() {
    this.setData({ showShareDialog: false });
  },

  // 分享内容输入
  onShareContentInput(e) {
    this.setData({ shareContent: e.detail.value });
  },

  // 选择分享图片
  async chooseShareImages() {
    try {
      const res = await wx.chooseMedia({
        count: 3,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      if (res.tempFiles && res.tempFiles.length > 0) {
        wx.showLoading({ title: '上传图片中...' });
        
        const uploadPromises = res.tempFiles.map(file => this.uploadImage(file.tempFilePath));
        const imageUrls = await Promise.all(uploadPromises);
        
        this.setData({
          shareImages: [...this.data.shareImages, ...imageUrls]
        });
        
        wx.hideLoading();
      }
    } catch (error) {
      wx.hideLoading();
      console.error('选择图片失败:', error);
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  },

  // 上传图片到LeanCloud
  async uploadImage(tempFilePath) {
    return new Promise((resolve, reject) => {
      const fileName = `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const file = new AV.File(fileName, {
        blob: { uri: tempFilePath }
      });

      file.save().then(savedFile => {
        resolve(savedFile.url());
      }).catch(reject);
    });
  },

  // 删除分享图片
  removeShareImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.shareImages;
    images.splice(index, 1);
    this.setData({ shareImages: images });
  },

  // 发布分享
  async publishShare() {
    const { shareContent, shareImages, userInfo } = this.data;
    
    if (!shareContent.trim()) {
      wx.showToast({
        title: '请输入分享内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    try {
      const result = await AV.Cloud.run('shareWellnessPost', {
        userId: userInfo.id,
        content: shareContent,
        images: shareImages,
        tags: this.data.shareTags,
        postType: 'general'
      });

      if (result && result.status === 'ok') {
        wx.hideLoading();
        wx.showToast({
          title: '发布成功！',
          icon: 'success'
        });

        this.closeShareDialog();
        this.refreshFeed(); // 刷新动态流
      }

    } catch (error) {
      wx.hideLoading();
      console.error('发布分享失败:', error);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    }
  },

  // 点赞动态
  async likePost(e) {
    const { postId, isLiked } = e.currentTarget.dataset;
    const currentUser = AV.User.current();
    
    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      const action = isLiked ? 'unlike' : 'like';
      const result = await AV.Cloud.run('likeWellnessPost', {
        userId: currentUser.id,
        postId: postId,
        action: action
      });

      if (result && result.status === 'ok') {
        // 更新本地数据
        const posts = this.data.posts.map(post => {
          if (post.postId === postId) {
            return {
              ...post,
              isLiked: action === 'like',
              likes: result.likes
            };
          }
          return post;
        });

        this.setData({ posts });
      }

    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 查看用户详情
  viewUserProfile(e) {
    const { userId } = e.currentTarget.dataset;
    // 这里可以跳转到用户详情页面
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 分享动态到微信
  shareToWeChat(e) {
    const { content } = e.currentTarget.dataset;
    // 这里可以调用微信分享API
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  }
});
