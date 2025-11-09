# Database Integration Testing Documentation

This document describes the database integration testing setup for the Warp Shopping List application.

## Overview

The application uses **Supabase Local** for integration testing, which provides a complete local Supabase instance running in Docker containers. This allows tests to run against a real PostgreSQL database with all triggers, RLS policies, and functions.

## Prerequisites

### Required Software

1. **Docker & Docker Compose**: Required to run Supabase local containers
   ```bash
   # Check Docker is installed
   docker --version
   docker-compose --version
   ```

2. **Supabase CLI**: Installed at `~/.local/bin/supabase`
   ```bash
   # Verify installation
   ~/.local/bin/supabase --version
   ```

3. **Node.js & npm**: For running Jest tests
   ```bash
   node --version  # Should be 18+ for Next.js 15
   npm --version
   ```

### Initial Setup

1. **Install Docker** (if not already installed):
   - Follow instructions at https://docs.docker.com/get-docker/
   - Add your user to the docker group: `sudo usermod -aG docker $USER`
   - Restart your terminal/machine for group changes to take effect

2. **Initialize Supabase** (already done, but for reference):
   ```bash
   npm run supabase:init  # Creates supabase/ directory and config
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

## Test Architecture

### Test Structure

```
src/__tests__/
├── helpers/
│   └── supabase-test-client.js    # Test utilities and client creation
└── integration/
    ├── database-sharing.test.js   # List sharing functions tests
    ├── database-rls.test.js        # Row Level Security tests
    └── database-triggers.test.js  # Database triggers tests
```

### Test Coverage

#### Database Functions (database-sharing.test.js)
Tests for all database functions:
- ✅ `setup_new_user()` - Creates default list, aisles, and preferences
- ✅ `generate_list_invite()` - Generates shareable invite tokens
- ✅ `join_list_via_invite()` - Allows users to join lists via invite
- ✅ `revoke_list_invites()` - Revokes all active invites for a list
- ✅ `leave_list()` - Removes user from list membership

#### Row Level Security (database-rls.test.js)
Tests RLS policies ensure proper data isolation:
- Shopping Lists: Users can only see lists they're members of
- Shopping Items: Users can only access items from their lists
- List Aisles: Users can only access aisles from their lists
- List Members: Users can see members of lists they belong to
- List Invites: Authenticated users can view invites for validation
- Shared Lists: Multiple users can access shared list data

#### Database Triggers (database-triggers.test.js)
Tests all database triggers:
- ✅ `cleanup_empty_lists` - Auto-deletes lists when last member leaves
- ✅ `ensure_one_active_list` - Maintains one active list per user
- ✅ `increment_purchase_count` - Tracks item completion history
- ✅ `handle_updated_at` - Automatic timestamp updates

## Running Tests

### Available Test Scripts

```bash
# Start Supabase local instance
npm run supabase:start

# Stop Supabase
npm run supabase:stop

# Check Supabase status
npm run supabase:status

# Reset database (apply migrations)
npm run supabase:reset

# Run all tests (starts/stops Supabase automatically)
npm test

# Run only integration tests
npm run test:db

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx jest src/__tests__/integration/database-sharing.test.js

# Run specific test by name
npx jest --testNamePattern="should create default list"

# Run tests with coverage
npm run test:coverage
```

### Test Workflow

1. **Automatic** (recommended):
   ```bash
   npm test  # Starts Supabase, runs tests, stops Supabase
   ```

2. **Manual** (for development):
   ```bash
   # Terminal 1: Start Supabase
   npm run supabase:start

   # Terminal 2: Run tests
   npx jest --testPathPatterns=integration --watch

   # When done, stop Supabase
   npm run supabase:stop
   ```

## Test Utilities

### supabase-test-client.js

Provides helper functions for testing:

#### `createServiceClient()`
Creates a Supabase client with service role (bypasses RLS).
```javascript
const client = createServiceClient();
```

#### `createAnonClient()`
Creates a Supabase client with anon key (respects RLS).
```javascript
const client = createAnonClient();
```

#### `createTestUser(serviceClient, identifier)`
Creates a test user in `auth.users` table.
```javascript
const userId = await createTestUser(serviceClient, 'user1');
// Returns: '00000000-0000-0000-0000-000000000001'
```

#### `cleanDatabase(serviceClient)`
Cleans all test data from the database.
```javascript
await cleanDatabase(serviceClient);
```

### Test User IDs

Tests use deterministic UUIDs for consistency:
- `user1`: `00000000-0000-0000-0000-000000000001`
- `user2`: `00000000-0000-0000-0000-000000000002`
- `user3`: `00000000-0000-0000-0000-000000000003`

## Database Configuration

### Connection Details (Local)

- **API URL**: `http://127.0.0.1:54321`
- **Database URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio URL**: `http://127.0.0.1:54323` (Supabase Studio UI)
- **Anon Key**: Default Supabase local anon key
- **Service Role Key**: Default Supabase local service role key

### Migration

The database schema is defined in:
```
supabase/migrations/20250101_unified_database_schema.sql
```

This migration includes:
- All table definitions
- Foreign key constraints
- RLS policies
- Database functions
- Triggers
- Default data setup

## CI/CD Integration

### GitHub Actions

The `.github/workflows/ci.yml` workflow includes Supabase setup:

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1

- name: Start Supabase local instance
  run: supabase start

- name: Run tests
  run: npm test

- name: Stop Supabase
  if: always()
  run: supabase stop --no-backup
```

Tests run automatically on:
- Push to `main` branch
- Pull requests
- Manual workflow dispatch

## Common Issues & Solutions

### Issue: Docker permission denied

**Solution**: Add your user to the docker group:
```bash
sudo usermod -aG docker $USER
# Then restart your terminal or logout/login
```

### Issue: Port already in use

**Solution**: Stop existing Supabase instance:
```bash
npm run supabase:stop
# Or check what's using the port
lsof -i :54321
```

### Issue: Migration fails

**Solution**: Reset the database:
```bash
npm run supabase:reset
```

### Issue: Tests fail with "foreign key constraint" errors

**Solution**: Ensure test users are created before running tests. The `createTestUser()` function handles this.

### Issue: Tests pass individually but fail together

**Cause**: Test interference due to shared database state or async timing issues.

**Solution**: Tests use `beforeEach` to clean and recreate test data. If issues persist, run tests serially:
```bash
npx jest --testPathPatterns=integration --runInBand
```

## Test Status

### Current Status (as of 2025-11-02)

- **Total Tests**: 34
- **Passing**: 12-21 (varies based on test execution order)
- **Known Issues**:
  - Some RLS tests don't properly enforce RLS since they use service role client
  - Test interference can occur when running all tests together
  - Individual test suites pass reliably when run in isolation

### Passing Test Categories

✅ **Core Functionality**:
- User setup and initialization
- List creation and membership
- Invite generation and validation
- List leaving (non-last member)
- Invite revocation

✅ **Triggers**:
- Purchase count increment
- Updated_at timestamps
- Active list management (partial)

✅ **Migrations**:
- All migrations apply successfully
- Schema is correct and complete

### Areas for Improvement

1. **RLS Testing**: Current RLS tests use service role which bypasses RLS. Need to create tests with authenticated clients to properly test RLS enforcement.

2. **Test Isolation**: Add better isolation between tests to prevent interference.

3. **Async Handling**: Improve async operation handling in test setup/teardown.

## Development Guidelines

### Writing New Tests

1. **Use helpers**: Always use helper functions from `supabase-test-client.js`

2. **Clean up**: Use `beforeEach` to clean database state:
   ```javascript
   beforeEach(async () => {
     await cleanDatabase(serviceClient);
     await createTestUser(serviceClient, 'user1');
   });
   ```

3. **Test structure**:
   ```javascript
   describe('Feature Name', () => {
     let serviceClient;
     let user1Id;

     beforeAll(async () => {
       serviceClient = createServiceClient();
       user1Id = await createTestUser(serviceClient, 'user1');
     });

     beforeEach(async () => {
       await cleanDatabase(serviceClient);
       await createTestUser(serviceClient, 'user1');
     });

     test('should do something', async () => {
       // Test code
     });
   });
   ```

4. **Error handling**: Always check both `data` and `error`:
   ```javascript
   const { data, error } = await serviceClient.rpc('function_name', params);
   expect(error).toBeNull();
   expect(data).toBeTruthy();
   ```

### Debugging Tests

1. **Run single test**:
   ```bash
   npx jest --testNamePattern="test name here"
   ```

2. **Add logging**:
   ```javascript
   console.log('Debug info:', { data, error });
   ```

3. **Check database state** using Supabase Studio:
   - Start Supabase: `npm run supabase:start`
   - Open Studio: http://127.0.0.1:54323
   - Browse tables and data

4. **Check Supabase logs**:
   ```bash
   docker logs supabase_db_warp-shopping-list
   ```

## Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Next Steps

1. **Improve RLS Tests**: Create authenticated clients for proper RLS testing
2. **Add More Test Coverage**: Cover edge cases and error conditions
3. **Performance Tests**: Add tests for query performance
4. **E2E Tests**: Add end-to-end tests for complete user workflows
5. **Fix Test Interference**: Investigate and fix async timing issues causing test failures when run together
