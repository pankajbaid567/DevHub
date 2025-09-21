import apiCall from './api.js';

// Authentication service
class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  // Register user
  async register(userData) {
    try {
      const { firstName, lastName, email, password } = userData;
      
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          email,
          password,
          fullName: `${firstName} ${lastName}`
        })
      });

      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await apiCall('/auth/me');
      return response.user;
    } catch (error) {
      this.logout(); // Clear invalid token
      throw new Error(error.message || 'Failed to get user info');
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  // Get stored user data
  getStoredUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Refresh token (placeholder for future implementation)
  async refreshToken() {
    // Implementation would depend on backend token refresh strategy
    return this.isAuthenticated();
  }
}

export default new AuthService();
