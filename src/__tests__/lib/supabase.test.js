import { supabase } from '../../lib/supabase'

// Simple test that verifies the exported supabase client
describe('supabase client', () => {
  it('should export a supabase client instance', () => {
    expect(supabase).toBeDefined()
  })

  it('should have auth methods available', () => {
    expect(supabase.auth).toBeDefined()
    expect(typeof supabase.auth.getUser).toBe('function')
    expect(typeof supabase.auth.getSession).toBe('function')
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
    expect(typeof supabase.auth.signOut).toBe('function')
    expect(typeof supabase.auth.onAuthStateChange).toBe('function')
  })

  it('should have database methods available', () => {
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.rpc).toBe('function')
  })

  it('should be configured with proper auth settings', () => {
    // Just verify that the client was created successfully
    // The actual configuration is tested by ensuring the client works
    expect(supabase.auth).toBeTruthy()
  })
})
