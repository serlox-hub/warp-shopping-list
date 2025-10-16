import { UserPreferencesService } from '../../lib/userPreferencesService.js'

// Mock external dependencies
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

const { supabase } = require('../../lib/supabase')

describe('UserPreferencesService', () => {
  const mockUserId = 'user-123'
  const mockPreferences = {
    id: 1,
    user_id: mockUserId,
    theme: 'dark',
    language: 'en',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  }

  let mockFrom, mockSelect, mockEq, mockSingle, mockUpsert

  beforeEach(() => {
    jest.clearAllMocks()
    console.error = jest.fn() // Mock console.error
    
    // Create mock chain for Supabase queries
    mockSingle = jest.fn()
    mockEq = jest.fn(() => ({
      single: mockSingle
    }))
    mockSelect = jest.fn(() => ({
      eq: mockEq,
      single: mockSingle
    }))
    mockUpsert = jest.fn(() => ({
      select: () => ({
        single: mockSingle
      })
    }))
    mockFrom = jest.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert
    }))
    
    supabase.from = mockFrom
    supabase.rpc = jest.fn()
  })

  describe('getUserPreferences', () => {
    it('should return user preferences successfully', async () => {
      mockSingle.mockResolvedValue({ data: mockPreferences, error: null })
      
      const result = await UserPreferencesService.getUserPreferences(mockUserId)
      
      expect(supabase.from).toHaveBeenCalledWith('user_preferences')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(result).toEqual(mockPreferences)
    })

    it('should create default preferences when user has no preferences (PGRST116 error)', async () => {
      const createDefaultSpy = jest.spyOn(UserPreferencesService, 'createDefaultUserPreferences')
        .mockResolvedValue(mockPreferences)
      
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      })
      
      const result = await UserPreferencesService.getUserPreferences(mockUserId)
      
      expect(createDefaultSpy).toHaveBeenCalledWith(mockUserId)
      expect(result).toEqual(mockPreferences)
      
      createDefaultSpy.mockRestore()
    })

    it('should throw error for non-PGRST116 database errors', async () => {
      const dbError = { code: 'OTHER_ERROR', message: 'Database error' }
      mockSingle.mockResolvedValue({ data: null, error: dbError })
      
      const result = await UserPreferencesService.getUserPreferences(mockUserId)
      
      expect(console.error).toHaveBeenCalledWith('Error getting user preferences:', dbError)
      expect(result).toEqual({ theme: 'system', language: 'en' })
    })

    it('should return default preferences on unexpected error', async () => {
      mockSingle.mockRejectedValue(new Error('Unexpected error'))
      
      const result = await UserPreferencesService.getUserPreferences(mockUserId)
      
      expect(console.error).toHaveBeenCalled()
      expect(result).toEqual({ theme: 'system', language: 'en' })
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const newPreferences = { theme: 'light', language: 'es' }
      const expectedUpsertData = {
        user_id: mockUserId,
        ...newPreferences,
        updated_at: expect.any(String)
      }
      
      mockSingle.mockResolvedValue({ data: { ...mockPreferences, ...newPreferences }, error: null })
      
      const result = await UserPreferencesService.updateUserPreferences(mockUserId, newPreferences)
      
      expect(supabase.from).toHaveBeenCalledWith('user_preferences')
      expect(mockUpsert).toHaveBeenCalledWith(
        expectedUpsertData,
        {
          onConflict: 'user_id',
          ignoreDuplicates: false
        }
      )
      expect(result).toEqual({ ...mockPreferences, ...newPreferences })
    })

    it('should throw error when update fails', async () => {
      const newPreferences = { theme: 'light' }
      const dbError = new Error('Update failed')
      
      mockSingle.mockResolvedValue({ data: null, error: dbError })
      
      await expect(UserPreferencesService.updateUserPreferences(mockUserId, newPreferences))
        .rejects.toThrow('Update failed')
      
      expect(console.error).toHaveBeenCalledWith('Error updating user preferences:', dbError)
    })

    it('should handle unexpected errors during update', async () => {
      const newPreferences = { theme: 'light' }
      const error = new Error('Unexpected error')
      
      mockFrom.mockImplementation(() => {
        throw error
      })
      
      await expect(UserPreferencesService.updateUserPreferences(mockUserId, newPreferences))
        .rejects.toThrow('Unexpected error')
      
      expect(console.error).toHaveBeenCalledWith('Error updating user preferences:', error)
    })
  })

  describe('createDefaultUserPreferences', () => {
    it('should create default preferences successfully', async () => {
      const getUserPreferencesSpy = jest.spyOn(UserPreferencesService, 'getUserPreferences')
        .mockResolvedValue(mockPreferences)
      
      supabase.rpc.mockResolvedValue({ data: { success: true }, error: null })
      
      const result = await UserPreferencesService.createDefaultUserPreferences(mockUserId)
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_default_user_preferences', {
        p_user_id: mockUserId
      })
      expect(getUserPreferencesSpy).toHaveBeenCalledWith(mockUserId)
      expect(result).toEqual(mockPreferences)
      
      getUserPreferencesSpy.mockRestore()
    })

    it('should return default preferences when RPC call fails', async () => {
      const rpcError = new Error('RPC failed')
      supabase.rpc.mockResolvedValue({ data: null, error: rpcError })
      
      const result = await UserPreferencesService.createDefaultUserPreferences(mockUserId)
      
      expect(console.error).toHaveBeenCalledWith('Error creating default user preferences:', rpcError)
      expect(result).toEqual({ theme: 'system', language: 'en' })
    })

    it('should handle unexpected errors during creation', async () => {
      const error = new Error('Unexpected error')
      supabase.rpc.mockRejectedValue(error)
      
      const result = await UserPreferencesService.createDefaultUserPreferences(mockUserId)
      
      expect(console.error).toHaveBeenCalledWith('Error creating default user preferences:', error)
      expect(result).toEqual({ theme: 'system', language: 'en' })
    })
  })

  describe('updateTheme', () => {
    it('should update only theme preference', async () => {
      const updateSpy = jest.spyOn(UserPreferencesService, 'updateUserPreferences')
        .mockResolvedValue({ ...mockPreferences, theme: 'dark' })
      
      const result = await UserPreferencesService.updateTheme(mockUserId, 'dark')
      
      expect(updateSpy).toHaveBeenCalledWith(mockUserId, { theme: 'dark' })
      expect(result.theme).toBe('dark')
      
      updateSpy.mockRestore()
    })
  })

  describe('updateLanguage', () => {
    it('should update only language preference', async () => {
      const updateSpy = jest.spyOn(UserPreferencesService, 'updateUserPreferences')
        .mockResolvedValue({ ...mockPreferences, language: 'es' })
      
      const result = await UserPreferencesService.updateLanguage(mockUserId, 'es')
      
      expect(updateSpy).toHaveBeenCalledWith(mockUserId, { language: 'es' })
      expect(result.language).toBe('es')
      
      updateSpy.mockRestore()
    })
  })

  describe('Static methods existence', () => {
    it('should have all expected static methods', () => {
      expect(typeof UserPreferencesService.getUserPreferences).toBe('function')
      expect(typeof UserPreferencesService.updateUserPreferences).toBe('function')
      expect(typeof UserPreferencesService.createDefaultUserPreferences).toBe('function')
      expect(typeof UserPreferencesService.updateTheme).toBe('function')
      expect(typeof UserPreferencesService.updateLanguage).toBe('function')
    })
  })
})
