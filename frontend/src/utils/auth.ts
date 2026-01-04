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

// Get stored auth token - No longer needed as we use httpOnly cookies
// But we might still want to know if we are logged in
export const getAuthToken = (): string | null => {
  return null;
};

// Get stored user data
export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('chatterly_user');
  return userData ? JSON.parse(userData) : null;
};

// Store auth data
export const setAuthData = (user: User): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chatterly_user', JSON.stringify(user));
};

// Clear auth data
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('chatterly_user');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getUser() !== null;
};

// API request with auth header
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${getApiUrl()}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies
  });
};

// Login function
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const requestBody = { email, password };
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  
  if (!response.ok) {
    const error: ApiError = result;
    throw new Error(error.error || error.message || 'Login failed');
  }

  setAuthData(result.user);
  return result;
};

// Register function
export const register = async (name: string, email: string, password: string, dateOfBirth: string, gender?: 'male' | 'female' | 'other', type?: 'free' | 'pro'): Promise<AuthResponse> => {
  const requestBody = { name, email, password, dateOfBirth, gender, type };
  
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();
  
  if (!response.ok) {
    const error: ApiError = result;
    
    // Handle Zod validation errors
    if (error.error === 'Validation error' && error.details) {
      const errorMessages = error.details.map(detail => `${detail.path.join('.')}: ${detail.message}`).join(', ');
      throw new Error(errorMessages);
    }
    
    throw new Error(error.error || error.message || 'Registration failed');
  }

  setAuthData(result.user);
  return result;
};

// Get current user profile
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiRequest('/auth/me');
  
  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }
  
  const data = await response.json();
  return data.user;
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthData();
  }
};
