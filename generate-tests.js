const fs = require('fs')
const path = require('path')

// Get all JavaScript files in src directory
function getAllJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      getAllJSFiles(filePath, fileList)
    } else if (file.endsWith('.js') && !file.includes('test')) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

// Generate basic test template
function generateTestTemplate(filePath) {
  const relativePath = path.relative('src', filePath)
  const modulePath = `../../${relativePath.replace(/\\/g, '/')}`
  const fileName = path.basename(filePath, '.js')
  const testDir = path.join('src', '__tests__', path.dirname(relativePath))
  const testFile = path.join(testDir, `${fileName}.test.js`)
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }
  
  // Skip if test already exists
  if (fs.existsSync(testFile)) {
    console.log(`Test already exists: ${testFile}`)
    return
  }
  
  let testContent = ''
  
  // Check if it's a React component
  if (filePath.includes('/components/') || filePath.includes('/app/')) {
    testContent = generateReactComponentTest(modulePath, fileName)
  } else if (filePath.includes('/contexts/')) {
    testContent = generateContextTest(modulePath, fileName)
  } else if (filePath.includes('/lib/')) {
    testContent = generateServiceTest(modulePath, fileName)
  } else {
    testContent = generateBasicTest(modulePath, fileName)
  }
  
  fs.writeFileSync(testFile, testContent)
  console.log(`Generated: ${testFile}`)
}

function generateReactComponentTest(modulePath, componentName) {
  return `import { render, screen } from '@testing-library/react'
import ${componentName} from '${modulePath}'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('../../lib/supabase')

// Mock contexts
const mockContextValue = {
  // Add mock context values as needed
}

const MockProvider = ({ children }) => {
  return children // Add proper provider wrapper if needed
}

describe('${componentName}', () => {
  const defaultProps = {
    // Add default props here
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    render(
      <MockProvider>
        <${componentName} {...defaultProps} />
      </MockProvider>
    )
    
    // Add basic rendering assertions
    expect(screen.getByRole('main')).toBeInTheDocument() // Adjust selector as needed
  })

  it('should handle all props correctly', () => {
    const customProps = {
      // Add test props
    }
    
    render(
      <MockProvider>
        <${componentName} {...customProps} />
      </MockProvider>
    )
    
    // Add assertions for prop handling
    expect(true).toBe(true) // Replace with actual tests
  })

  // Add more specific tests based on component functionality
})
`
}

function generateContextTest(modulePath, contextName) {
  return `import { renderHook, act } from '@testing-library/react'
import { ${contextName}, use${contextName} } from '${modulePath}'

describe('${contextName}', () => {
  const wrapper = ({ children }) => (
    <${contextName}>
      {children}
    </${contextName}>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide context value', () => {
    const { result } = renderHook(() => use${contextName}(), { wrapper })
    
    expect(result.current).toBeDefined()
    // Add specific context value assertions
  })

  it('should handle context updates', () => {
    const { result } = renderHook(() => use${contextName}(), { wrapper })
    
    act(() => {
      // Trigger context updates
    })
    
    // Add assertions for updated values
    expect(true).toBe(true) // Replace with actual tests
  })

  // Add more context-specific tests
})
`
}

function generateServiceTest(modulePath, serviceName) {
  return `import * as ${serviceName}Module from '${modulePath}'

// Mock external dependencies
jest.mock('../../lib/supabase')

describe('${serviceName}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should export expected functions/values', () => {
    // Test that all expected exports exist
    expect(${serviceName}Module).toBeDefined()
    
    // Add specific export assertions
    // expect(typeof ${serviceName}Module.someFunction).toBe('function')
  })

  it('should handle successful operations', async () => {
    // Mock successful responses
    
    // Test successful scenarios
    expect(true).toBe(true) // Replace with actual tests
  })

  it('should handle error cases gracefully', async () => {
    // Mock error responses
    
    // Test error handling
    expect(true).toBe(true) // Replace with actual tests
  })

  // Add more service-specific tests
})
`
}

function generateBasicTest(modulePath, fileName) {
  return `import * as ${fileName}Module from '${modulePath}'

describe('${fileName}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(${fileName}Module).toBeDefined()
  })

  it('should export expected values', () => {
    // Add specific export tests
    expect(true).toBe(true) // Replace with actual tests
  })

  // Add more specific tests based on module functionality
})
`
}

// Main execution
const srcFiles = getAllJSFiles('src')
console.log(`Found ${srcFiles.length} JS files to generate tests for:`)

srcFiles.forEach(file => {
  console.log(`- ${file}`)
  generateTestTemplate(file)
})

console.log('\nTest generation complete!')
console.log('\nNext steps:')
console.log('1. Review generated tests')
console.log('2. Implement actual test logic')
console.log('3. Run: npm test')
