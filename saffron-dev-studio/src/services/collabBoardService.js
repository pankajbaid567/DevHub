import apiCall from './api.js';

const collabBoardService = {
  // Get all boards for the user
  async getBoards({ type = 'my-boards', page = 1, limit = 20 } = {}) {
    try {
      return await apiCall(`/boards?type=${type}&page=${page}&limit=${limit}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch boards');
    }
  },

  // Get a specific board by ID
  async getBoard(boardId) {
    try {
      return await apiCall(`/boards/${boardId}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch board');
    }
  },

  // Create a new collaborative board
  async createBoard({ name, description, isPublic = false }) {
    try {
      return await apiCall('/boards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          isPublic
        })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to create board');
    }
  },

  // Update board data (canvas state, name, description)
  async updateBoard(boardId, { boardData, name, description }) {
    try {
      return await apiCall(`/boards/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify({
          boardData,
          name,
          description
        })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to update board');
    }
  },

  // Add collaborator to board
  async addCollaborator(boardId, { userEmail, role = 'editor' }) {
    try {
      return await apiCall(`/boards/${boardId}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({
          userEmail,
          role
        })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to add collaborator');
    }
  },

  // Delete a board
  async deleteBoard(boardId) {
    try {
      return await apiCall(`/boards/${boardId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to delete board');
    }
  },

  // Get board collaborators
  async getBoardCollaborators(boardId) {
    try {
      return await apiCall(`/boards/${boardId}/collaborators`);
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch collaborators');
    }
  },

  // Remove collaborator from board
  async removeCollaborator(boardId, userId) {
    try {
      return await apiCall(`/boards/${boardId}/collaborators/${userId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to remove collaborator');
    }
  },

  // Update collaborator role
  async updateCollaboratorRole(boardId, userId, role) {
    try {
      return await apiCall(`/boards/${boardId}/collaborators/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to update collaborator role');
    }
  },

  // Search boards
  async searchBoards(query, { page = 1, limit = 20 } = {}) {
    try {
      return await apiCall(`/boards/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to search boards');
    }
  },

  // Get board activity/history
  async getBoardActivity(boardId) {
    try {
      return await apiCall(`/boards/${boardId}/activity`);
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch board activity');
    }
  },

  // Export board data
  async exportBoard(boardId, format = 'json') {
    try {
      return await apiCall(`/boards/${boardId}/export?format=${format}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to export board');
    }
  },

  // Duplicate board
  async duplicateBoard(boardId, { name, description }) {
    try {
      return await apiCall(`/boards/${boardId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          description
        })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to duplicate board');
    }
  },

  // Get board templates
  async getBoardTemplates() {
    try {
      return await apiCall('/boards/templates');
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch board templates');
    }
  },

  // Create board from template
  async createBoardFromTemplate(templateId, { name, description }) {
    try {
      return await apiCall('/boards/from-template', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          name,
          description
        })
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to create board from template');
    }
  }
};

export default collabBoardService;
