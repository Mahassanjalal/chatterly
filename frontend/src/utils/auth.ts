// Authentication utilities

export interface User {
  id: string;
  name: string;
  email: string;
  gender?: 'male' | 'female' | 'other';
  type: 'free' | 'pro';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{ message: string; path: string[] }>;
}

// Get API base URL
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
};

// Get stored auth token
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chatterly_token');
};

// Get stored user data
export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('chatterly_user');
  return userData ? JSON.parse(userData) : null;
};

// Store auth data
export const setAuthData = (token: string, user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chatterly_token', token);
  localStorage.setItem('chatterly_user', JSON.stringify(user));
};

// Clear auth data
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('chatterly_token');
  localStorage.removeItem('chatterly_user');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

// API request with auth header
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  const url = `${getApiUrl()}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Login function
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const requestBody = { email, password };
  
  // Debug logging (remove in production)
  console.log('Login request:', requestBody);
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  
  // Debug logging (remove in production)
  console.log('Login response:', { status: response.status, result });

  if (!response.ok) {
    const error: ApiError = result;
    throw new Error(error.error || error.message || 'Login failed');
  }

  setAuthData(result.token, result.user);
  return result;
};

// Register function
export const register = async (name: string, email: string, password: string, gender?: 'male' | 'female' | 'other', type?: 'free' | 'pro'): Promise<AuthResponse> => {
  const requestBody = { name, email, password, gender, type };
  
  // Debug logging (remove in production)
  console.log('Registration request:', requestBody);
  
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  
  // Debug logging (remove in production)
  console.log('Registration response:', { status: response.status, result });

  if (!response.ok) {
    const error: ApiError = result;
    
    // Handle Zod validation errors
    if (error.error === 'Validation error' && error.details) {
      console.log('Validation errors:', error.details);
      const errorMessages = error.details.map(detail => `${detail.path.join('.')}: ${detail.message}`).join(', ');
      throw new Error(errorMessages);
    }
    
    throw new Error(error.error || error.message || 'Registration failed');
  }

  setAuthData(result.token, result.user);
  return result;
};

// Get current user profile
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiRequest('/auth/me');
  
  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }
  
  return response.json();
};

// Logout function
export const logout = (): void => {
  clearAuthData();
};
