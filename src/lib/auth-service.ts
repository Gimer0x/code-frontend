class AuthService {
  private baseURL: string;
  private accessToken: string | null;
  private refreshToken: string | null;
  private inFlightProfile: Promise<any> | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    this.accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    this.refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  }

  // Set tokens in localStorage
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  // Clear tokens
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // Get authorization header
  getAuthHeader(): string | null {
    return this.accessToken ? `Bearer ${this.accessToken}` : null;
  }

  // Make authenticated request
  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers
    });

    // If token expired, try to refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        headers.Authorization = `Bearer ${this.accessToken}`;
        return fetch(`${this.baseURL}${url}`, {
          ...options,
          headers
        });
      }
    }

    return response;
  }

  // Register user
  async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN' | 'STUDENT';
  }) {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (data.success) {
      this.setTokens(data.accessToken, data.refreshToken);
    }

    return data;
  }

  // Login user
  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (data.success) {
      this.setTokens(data.accessToken, data.refreshToken);
    }

    return data;
  }

  // Refresh access token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }

  // Login with Google ID token -> exchange with backend
  async googleLogin(idToken: string) {
    const response = await fetch(`${this.baseURL}/api/user-auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    })

    const data = await response.json()
    if (data.success) {
      this.setTokens(data.accessToken, data.refreshToken)
    }
    return data
  }

  // Get user profile
  async getProfile() {
    if (this.inFlightProfile) return this.inFlightProfile
    this.inFlightProfile = (async () => {
      const response = await this.makeRequest('/api/auth/profile');
      const data = await response.json();
      this.inFlightProfile = null
      return data
    })()
    return this.inFlightProfile
  }

  // Update profile
  async updateProfile(updateData: { name?: string; photoUrl?: string }) {
    const response = await this.makeRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return response.json();
  }

  // Change password
  async changePassword(passwordData: { currentPassword: string; newPassword: string }) {
    const response = await this.makeRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
    return response.json();
  }

  // Logout
  logout() {
    this.clearTokens();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Check if user is admin
  async isAdmin(): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      return profile.success && profile.user.role === 'ADMIN';
    } catch {
      return false;
    }
  }

  // Create admin user (one-time setup)
  async createAdmin(adminData: { email: string; password: string; name: string }) {
    const response = await fetch(`${this.baseURL}/api/admin/create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    return response.json();
  }
}

export const authService = new AuthService();
export default AuthService;
