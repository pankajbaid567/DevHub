const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

class StudyRoomService {
  constructor() {
    // Clean the URL and ensure proper /api path
    const cleanURL = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
    const baseURL = cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`;
    this.baseURL = `${baseURL}/study-rooms`;
  }

  // Get authentication token from localStorage
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Get headers with authentication
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Fetch all public study rooms
  async getStudyRooms(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        type: 'public',
        limit: params.limit || 20,
        page: params.page || 1,
        ...(params.subject && { subject: params.subject })
      });

      const response = await fetch(`${this.baseURL}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching study rooms:', error);
      throw error;
    }
  }

  // Get user's study rooms
  async getMyStudyRooms(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        type: 'my-rooms',
        limit: params.limit || 20,
        page: params.page || 1
      });

      const response = await fetch(`${this.baseURL}?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching my study rooms:', error);
      throw error;
    }
  }

  // Create a new study room
  async createStudyRoom(roomData) {
    try {
      const token = this.getAuthToken();
      console.log('Creating study room with token:', token ? 'Token present' : 'No token');
      console.log('Request URL:', this.baseURL);
      console.log('Request data:', roomData);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(roomData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
          console.error('Error response data:', errorData);
        } catch (parseError) {
          errorMessage = `HTTP error! status: ${response.status}`;
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response:', data);
      return data;
    } catch (error) {
      console.error('Error creating study room:', error);
      throw error;
    }
  }

  // Join a study room
  async joinStudyRoom(roomId, inviteCode = null) {
    try {
      const response = await fetch(`${this.baseURL}/${roomId}/join`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ inviteCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error joining study room:', error);
      throw error;
    }
  }

  // Leave a study room
  async leaveStudyRoom(roomId) {
    try {
      const response = await fetch(`${this.baseURL}/${roomId}/leave`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error leaving study room:', error);
      throw error;
    }
  }

  // Get study room details
  async getStudyRoomDetails(roomId) {
    try {
      const response = await fetch(`${this.baseURL}/${roomId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching study room details:', error);
      throw error;
    }
  }
}

export default new StudyRoomService();
