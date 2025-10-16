import { renderToStaticMarkup } from 'react-dom/server'
import RootLayout from '../../app/layout.js'

// Mock global CSS import
jest.mock('../../app/globals.css', () => {})

// Mock dependencies
jest.mock('next/navigation')
jest.mock('../../lib/supabase')

// Mock context providers
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>
}))

jest.mock('../../contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }) => <div data-testid="language-provider">{children}</div>
}))

jest.mock('../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>
}))

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Test child content</div>
      </RootLayout>
    )
    
    expect(markup).toContain('<html lang="en">')
    expect(markup).toContain('<body>')
    expect(markup).toContain('Test child content')
  })

  it('should render with context providers in correct order', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div data-testid="child-content">Test child content</div>
      </RootLayout>
    )
    
    const authIndex = markup.indexOf('data-testid="auth-provider"')
    const languageIndex = markup.indexOf('data-testid="language-provider"')
    const themeIndex = markup.indexOf('data-testid="theme-provider"')
    const childIndex = markup.indexOf('data-testid="child-content"')

    expect(authIndex).toBeGreaterThan(-1)
    expect(languageIndex).toBeGreaterThan(-1)
    expect(themeIndex).toBeGreaterThan(-1)
    expect(childIndex).toBeGreaterThan(-1)
    expect(authIndex).toBeLessThan(languageIndex)
    expect(languageIndex).toBeLessThan(themeIndex)
    expect(themeIndex).toBeLessThan(childIndex)
  })

  it('should have proper HTML structure', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Main content</main>
      </RootLayout>
    )
    
    expect(markup).toContain('<html lang="en">')
    expect(markup).toMatch(/<body>[\s\S]*Main content[\s\S]*<\/body>/)
  })
})
