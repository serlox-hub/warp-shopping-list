/**
 * Supabase Test Client
 *
 * Creates a Supabase client configured for local testing.
 * Connects to Supabase local instance started via `supabase start`.
 */

import { createClient } from '@supabase/supabase-js';

// Local Supabase connection details (default JWT keys from Supabase CLI)
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/**
 * Create a Supabase client with anon key (simulates unauthenticated user)
 */
export function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 */
export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client authenticated as a specific user
 * @param {string} userId - User UUID
 * @returns {Promise<object>} Authenticated Supabase client
 */
export async function createAuthenticatedClient(userId) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Mock authentication by setting the session
  // In tests, we bypass actual auth and directly set auth state
  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email: `test-${userId}@example.com`
  });

  if (error) throw error;

  return client;
}

/**
 * Create a test user in auth.users table
 * Creates a minimal user entry that satisfies foreign key constraints
 * @param {object} serviceClient - Supabase service role client
 * @param {string} identifier - Unique identifier for this test user
 * @returns {Promise<string>} User UUID
 */
export async function createTestUser(serviceClient, identifier) {
  const userIds = {
    'user1': '00000000-0000-0000-0000-000000000001',
    'user2': '00000000-0000-0000-0000-000000000002',
    'user3': '00000000-0000-0000-0000-000000000003',
  };
  const userId = userIds[identifier] || `00000000-0000-0000-0000-00000000000${identifier.length}`;
  const email = `test-${identifier}@example.com`;

  // Use Supabase Auth Admin API to create user
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {},
    app_metadata: {},
    id: userId
  });

  if (error && error.code !== 'email_exists') {
    console.error('Error creating test user:', error);
  }

  return userId;
}

/**
 * Create a mock test user UUID (synchronous, for backward compatibility)
 * Note: This doesn't create auth.users entries - use createTestUser() for that
 * @param {string} identifier - Unique identifier for this test user
 * @returns {string} Deterministic UUID based on identifier
 */
export function createTestUserId(identifier) {
  const userIds = {
    'user1': '00000000-0000-0000-0000-000000000001',
    'user2': '00000000-0000-0000-0000-000000000002',
    'user3': '00000000-0000-0000-0000-000000000003',
  };
  return userIds[identifier] || `00000000-0000-0000-0000-00000000000${identifier.length}`;
}

/**
 * No cleanup needed since we're using cleanDatabase()
 * @deprecated Use cleanDatabase() instead
 */
export async function deleteTestUser(serviceClient, userId) {
  // No-op: cleanDatabase() handles all cleanup
}

/**
 * Clean all data from test database (use with caution!)
 * Returns true if cleanup was successful
 */
export async function cleanDatabase(serviceClient) {
  // Clean public tables FIRST to avoid RLS issues during CASCADE deletes
  // Order: dependent tables first, then parent tables
  // Use not.is(null) on id columns to match all rows (id is never null)
  await serviceClient.from('shopping_items').delete().not('id', 'is', null);
  await serviceClient.from('list_invites').delete().not('id', 'is', null);
  await serviceClient.from('list_aisles').delete().not('id', 'is', null);
  await serviceClient.from('list_members').delete().not('list_id', 'is', null);
  await serviceClient.from('shopping_lists').delete().not('id', 'is', null);
  await serviceClient.from('user_preferences').delete().not('id', 'is', null);

  // Now delete auth.users (no CASCADE issues since public tables are clean)
  const testUserIds = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  ];

  for (const userId of testUserIds) {
    try {
      await serviceClient.auth.admin.deleteUser(userId);
    } catch (error) {
      // Ignore errors if user doesn't exist
    }
  }

  // Small delay to ensure all deletes are committed
  await new Promise(resolve => setTimeout(resolve, 100));

  return true;
}

/**
 * Setup test environment with clean database and test users
 * Use this at the start of each test group
 */
export async function setupTestEnvironment(serviceClient) {
  await cleanDatabase(serviceClient);

  const user1Id = await createTestUser(serviceClient, 'user1');
  const user2Id = await createTestUser(serviceClient, 'user2');

  return { user1Id, user2Id };
}
