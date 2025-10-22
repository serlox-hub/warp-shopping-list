import { renderHook, act } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext.js'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      off: jest.fn()
    }
  })
}))

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null })
}))

// Mock UserPreferencesService
jest.mock('../../lib/userPreferencesService', () => ({
  UserPreferencesService: {
    getUserPreferences: jest.fn().mockResolvedValue({ language: 'en' }),
    updateLanguage: jest.fn().mockResolvedValue()
  }
}))

// Mock i18n module
jest.mock('../../lib/i18n', () => {})

describe('LanguageContext', () => {
  const wrapper = ({ children }) => (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide context value', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })
    
    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('currentLanguage')
    expect(result.current).toHaveProperty('changeLanguage')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('availableLanguages')
  })

  it('should handle language change', async () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })

    await act(async () => {
      await result.current.changeLanguage('es')
    })

    expect(result.current.changeLanguage).toBeDefined()
  })

  // Add more context-specific tests
})
