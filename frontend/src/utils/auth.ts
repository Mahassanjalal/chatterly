// Authentication utilities

export interface User {
  id: string;
  name: string;
  email: string;
  gender?: 'male' | 'female' | 'other';
  type: 'free' | 'pro';
  role?: 'user' | 'moderator' | 'admin';
  isEmailVerified?: boolean;
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
// export const getAuthToken = (): string | null => {
//   return null;
// };

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

// Store token
export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chatterly_token', token);
};

// Get stored auth token
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('chatterly_token');
};

// Clear auth data
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('chatterly_user');
  localStorage.removeItem('chatterly_token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getUser() !== null;
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.role === 'admin';
};

// Check if user is moderator or admin
export const isModerator = (): boolean => {
  const user = getUser();
  return user?.role === 'admin' || user?.role === 'moderator';
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

  // Store both user data and token
  if (result.user) {
    setAuthData(result.user);
  }
  if (result.token) {
    setAuthToken(result.token);
  }
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

  // Store both user data and token
  if (result.user) {
    setAuthData(result.user);
  }
  if (result.token) {
    setAuthToken(result.token);
  }
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

// Verify email
export const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Verification failed');
  }

  return result;
};

// Resend verification email
export const resendVerificationEmail = async (): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/auth/resend-verification', {
    method: 'POST',
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to resend verification email');
  }

  return result;
};

// Forgot password
export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to send password reset email');
  }

  return result;
};

// Reset password
export const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to reset password');
  }

  return result;
};

// Block a user
export const blockUser = async (userIdToBlock: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/blocking/block', {
    method: 'POST',
    body: JSON.stringify({ userIdToBlock }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to block user');
  }

  return result;
};

// Unblock a user
export const unblockUser = async (userIdToUnblock: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/blocking/unblock', {
    method: 'POST',
    body: JSON.stringify({ userIdToUnblock }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to unblock user');
  }

  return result;
};

// Get blocked users
export const getBlockedUsers = async (): Promise<{ blockedUsers: Array<{ id: string; name: string }>; count: number }> => {
  const response = await apiRequest('/blocking');

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to get blocked users');
  }

  return result;
};

// Export user data (GDPR)
export const exportUserData = async (): Promise<Blob> => {
  const response = await apiRequest('/gdpr/export');

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || result.message || 'Failed to export data');
  }

  return response.blob();
};

// Delete account (GDPR)
export const deleteAccount = async (password: string, confirmation: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiRequest('/gdpr/delete-account', {
    method: 'POST',
    body: JSON.stringify({ password, confirmation }),
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to delete account');
  }

  clearAuthData();
  return result;
};

export const verifyAuthState = (): {hasUser: boolean; hasToken: boolean; user: User | null, token: string | null} => {
  const user = getUser();
  const token = getAuthToken();
  return {
    hasUser: !!user,
    hasToken: !!token,
    user,
    token
  };
};