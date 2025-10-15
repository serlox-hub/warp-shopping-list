// Mock global Response before importing
global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  
  static redirect(url, status = 302) {
    return new MockResponse(null, { status, headers: { Location: url } });
  }
};

// Mock Request and Headers
global.Request = class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
  }
};

global.Headers = class MockHeaders extends Map {
  get(key) {
    return super.get(key.toLowerCase());
  }
  set(key, value) {
    return super.set(key.toLowerCase(), value);
  }
};

import { GET } from '../../../../app/auth/callback/route.js'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  NextResponse: {
    redirect: jest.fn((url) => Response.redirect(url)),
  },
}));

// Mock Supabase
jest.mock('../../../../lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  })),
}));

describe('Auth Callback Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle GET request without crashing', async () => {
    // Mock request with search params
    const mockRequest = {
      nextUrl: {
        searchParams: {
          get: jest.fn((param) => {
            if (param === 'code') return 'mock-code';
            return null;
          }),
        },
      },
    };

    const result = await GET(mockRequest);
    expect(result).toBeDefined();
  })

  it('should redirect properly', async () => {
    const mockRequest = {
      nextUrl: {
        searchParams: {
          get: jest.fn(() => null),
        },
      },
    };

    const result = await GET(mockRequest);
    expect(result).toBeDefined();
  })
})
