// Mock Next.js modules first
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn(() => ({ status: 302, headers: { location: '/' } })),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  })),
}));

// Import after mocks are set up
import { GET } from '../../../../app/auth/callback/route.js'

describe('Auth Callback Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle GET request with code', async () => {
    // Mock request with URL containing code
    const mockRequest = {
      url: 'http://localhost:3000/auth/callback?code=auth_code_123'
    };

    const result = await GET(mockRequest);
    expect(result).toBeDefined();
  })

  it('should handle GET request without code', async () => {
    // Mock request without code
    const mockRequest = {
      url: 'http://localhost:3000/auth/callback'
    };

    const result = await GET(mockRequest);
    expect(result).toBeDefined();
  })
})
