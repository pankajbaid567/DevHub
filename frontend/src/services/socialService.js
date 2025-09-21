import apiCall from './api.js';

// Social media service
class SocialService {
  // Get posts for social feed
  async getPosts({ page = 1, limit = 10, filter = 'all' } = {}) {
    try {
      const endpoint = filter === 'following' 
        ? `/posts/following?page=${page}&limit=${limit}`
        : filter === 'trending'
        ? `/posts/trending?page=${page}&limit=${limit}`
        : `/social/posts?page=${page}&limit=${limit}&filter=${filter}`;

      return await apiCall(endpoint);
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch posts');
    }
  }

  // Create a new post
  async createPost(postData) {
    try {
      // Map frontend field names to backend schema
      const backendData = {
        content: postData.content,
        codeSnippet: postData.codeContent || postData.codeSnippet,
        language: postData.language,
        imageUrl: postData.imageUrl,
        tags: postData.tags || []
      };
      
      return await apiCall('/social/posts', {
        method: 'POST',
        body: JSON.stringify(backendData)
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to create post');
    }
  }

  // Like/unlike a post
  async toggleLike(postId) {
    try {
      return await apiCall(`/social/posts/${postId}/like`, {
        method: 'POST'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to toggle like');
    }
  }

  // Add comment to a post
  async addComment(postId, content) {
    try {
      return await apiCall(`/social/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to add comment');
    }
  }

  // Get comments for a post
  async getComments(postId, { page = 1, limit = 20 } = {}) {
    try {
      return await apiCall(`/social/posts/${postId}/comments?page=${page}&limit=${limit}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to get comments');
    }
  }

  // Follow/unfollow a user
  async toggleFollow(userId) {
    try {
      return await apiCall(`/social/follow/${userId}`, {
        method: 'POST'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to toggle follow');
    }
  }

  // Get user's social profile
  async getSocialProfile() {
    try {
      return await apiCall('/social/profile');
    } catch (error) {
      throw new Error(error.message || 'Failed to get social profile');
    }
  }

  // Get user profile by username
  async getUserProfile(username) {
    try {
      return await apiCall(`/social/profile/${username}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  // Search users
  async searchUsers(query, { page = 1, limit = 20 } = {}) {
    try {
      return await apiCall(`/social/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to search users');
    }
  }

  // Discover developers
  async discoverDevelopers({ 
    page = 1, 
    limit = 20, 
    search = '', 
    location = '', 
    skills = '', 
    experience = '', 
    company = '',
    sortBy = 'relevance' 
  } = {}) {
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(location && { location }),
        ...(skills && { skills }),
        ...(experience && { experience }),
        ...(company && { company }),
        sortBy
      });

      return await apiCall(`/social/developers?${params.toString()}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to discover developers');
    }
  }

  // Share a post
  async sharePost(postId) {
    try {
      return await apiCall(`/posts/${postId}/share`, {
        method: 'POST'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to share post');
    }
  }

  // Bookmark a post
  async bookmarkPost(postId) {
    try {
      return await apiCall(`/posts/${postId}/bookmark`, {
        method: 'POST'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to bookmark post');
    }
  }
}

export default new SocialService();
