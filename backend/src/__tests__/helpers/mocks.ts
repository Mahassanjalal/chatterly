import { IUser } from '../../models/user.model';
import { IReport } from '../../models/report.model';

/**
 * Creates a mock user object for testing purposes
 */
export function createMockUser(overrides: Partial<IUser> = {}): IUser {
  const defaultUser: Partial<IUser> = {
    _id: `user_${Math.random().toString(36).substring(7)}`,
    name: 'Test User',
    email: `test${Math.random().toString(36).substring(7)}@example.com`,
    password: 'hashedpassword123',
    gender: 'male',
    dateOfBirth: new Date('1990-01-01'),
    type: 'free',
    status: 'active',
    role: 'user',
    flags: {
      isEmailVerified: false,
      requiresCaptcha: false,
      isUnderReview: false,
    },
    stats: {
      reportCount: 0,
      warningCount: 0,
      connectionCount: 0,
      averageCallDuration: 0,
    },
    restrictions: {
      isSuspended: false,
      isPermBanned: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn().mockResolvedValue(true),
  };

  return { ...defaultUser, ...overrides } as IUser;
}

/**
 * Creates a mock report object for testing purposes
 */
export function createMockReport(overrides: Partial<IReport> = {}): IReport {
  const defaultReport: Partial<IReport> = {
    _id: `report_${Math.random().toString(36).substring(7)}`,
    reportedUserId: `user_${Math.random().toString(36).substring(7)}`,
    reporterUserId: `user_${Math.random().toString(36).substring(7)}`,
    reason: 'inappropriate_behavior',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultReport, ...overrides } as IReport;
}

/**
 * Creates a mock Redis client for testing purposes
 */
export function createMockRedis() {
  const data = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const sortedSets = new Map<string, Array<{ score: number; value: string }>>();

  return {
    get: jest.fn((key: string) => Promise.resolve(data.get(key) || null)),
    set: jest.fn((key: string, value: string) => {
      data.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      data.delete(key);
      return Promise.resolve(1);
    }),
    sadd: jest.fn((key: string, value: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(value);
      return Promise.resolve(1);
    }),
    srem: jest.fn((key: string, value: string) => {
      if (sets.has(key)) {
        sets.get(key)!.delete(value);
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }),
    smembers: jest.fn((key: string) => {
      return Promise.resolve(Array.from(sets.get(key) || []));
    }),
    scard: jest.fn((key: string) => {
      return Promise.resolve(sets.get(key)?.size || 0);
    }),
    zadd: jest.fn((key: string, score: number, value: string) => {
      if (!sortedSets.has(key)) sortedSets.set(key, []);
      sortedSets.get(key)!.push({ score, value });
      return Promise.resolve(1);
    }),
    zrem: jest.fn((key: string, value: string) => {
      if (sortedSets.has(key)) {
        const arr = sortedSets.get(key)!;
        const idx = arr.findIndex(item => item.value === value);
        if (idx !== -1) {
          arr.splice(idx, 1);
          return Promise.resolve(1);
        }
      }
      return Promise.resolve(0);
    }),
    zcard: jest.fn((key: string) => {
      return Promise.resolve(sortedSets.get(key)?.length || 0);
    }),
    expire: jest.fn(() => Promise.resolve(1)),
    exists: jest.fn((key: string) => Promise.resolve(data.has(key) ? 1 : 0)),
    clear: () => {
      data.clear();
      sets.clear();
      sortedSets.clear();
    },
  };
}

/**
 * Creates a mock socket for testing purposes
 */
export function createMockSocket(overrides: Record<string, unknown> = {}) {
  return {
    id: `socket_${Math.random().toString(36).substring(7)}`,
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
    handshake: {
      auth: {},
      headers: {},
    },
    ...overrides,
  };
}

/**
 * Creates a mock logger for testing purposes
 */
export function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}
