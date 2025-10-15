import { render, screen } from '@testing-library/react'
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
    const { container } = render(
      <RootLayout>
        <div>Test child content</div>
      </RootLayout>
    )
    
    // Check that the basic HTML structure is rendered
    expect(container.querySelector('html')).toBeInTheDocument()
    expect(container.querySelector('body')).toBeInTheDocument()
    expect(screen.getByText('Test child content')).toBeInTheDocument()
  })

  it('should render with context providers in correct order', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Test child content</div>
      </RootLayout>
    )
    
    // Check that all provider wrappers are present
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('language-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('should have proper HTML structure', () => {
    const { container } = render(
      <RootLayout>
        <main>Main content</main>
      </RootLayout>
    )
    
    const html = container.querySelector('html')
    expect(html).toHaveAttribute('lang', 'en')
    expect(screen.getByText('Main content')).toBeInTheDocument()
  })
})
