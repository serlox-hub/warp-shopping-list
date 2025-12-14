/**
 * Database Integration Tests - List Sharing
 *
 * Tests all sharing-related database functions against real Supabase instance:
 * - generate_list_invite()
 * - revoke_list_invites()
 * - join_list_via_invite()
 * - leave_list()
 * - setup_new_user()
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import {
  createServiceClient,
  createTestUser,
  cleanDatabase,
  createTestUserId
} from '../helpers/supabase-test-client';

describe('Database Sharing Functions', () => {
  let serviceClient;
  // Use constant IDs for predictability
  const user1Id = createTestUserId('user1');
  const user2Id = createTestUserId('user2');

  beforeAll(async () => {
    serviceClient = createServiceClient();
    // Initial cleanup
    await cleanDatabase(serviceClient);
  });

  afterAll(async () => {
    // Final cleanup
    await cleanDatabase(serviceClient);
  });

  beforeEach(async () => {
    // Clean database and recreate test users before each test
    await cleanDatabase(serviceClient);
    await createTestUser(serviceClient, 'user1');
    await createTestUser(serviceClient, 'user2');
  });

  describe('setup_new_user()', () => {
    test('should create default list, aisles, and preferences for new user', async () => {
      // Call setup_new_user
      const { data: listId, error: setupError } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      expect(setupError).toBeNull();
      expect(listId).toBeTruthy();

      // Verify list was created
      const { data: lists, error: listsError } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      expect(listsError).toBeNull();
      expect(lists.name).toBe('My Shopping List');
      expect(lists.created_by).toBe(user1Id);

      // Verify user is a member
      const { data: members, error: membersError } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .eq('user_id', user1Id)
        .single();

      expect(membersError).toBeNull();
      expect(members.is_active).toBe(true);

      // Verify default aisles were created
      const { data: aisles, error: aislesError } = await serviceClient
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId)
        .order('display_order');

      expect(aislesError).toBeNull();
      expect(aisles).toHaveLength(9); // 9 default aisles
      expect(aisles[0].name).toBe('Produce');
      expect(aisles[8].name).toBe('Other');

      // Verify preferences were created
      const { data: prefs, error: prefsError } = await serviceClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user1Id)
        .single();

      expect(prefsError).toBeNull();
      expect(prefs.language).toBe('en');
      expect(prefs.theme).toBe('system');
    });

    test('should be idempotent - return existing list if user already setup', async () => {
      // First call
      const { data: listId1 } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Second call
      const { data: listId2 } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      expect(listId1).toBe(listId2);

      // Should still only have 1 list
      const { data: lists } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('created_by', user1Id);

      expect(lists).toHaveLength(1);
    });
  });

  describe('generate_list_invite()', () => {
    let listId;

    beforeEach(async () => {
      // Setup user1 with a list
      const { data, error } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });
      if (error) throw new Error(`setup_new_user failed: ${error.message}`);
      listId = data;
    });

    test('should generate a valid invite token', async () => {
      const { data, error } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].token).toBeTruthy();
      expect(data[0].token).toHaveLength(32);
      expect(data[0].expires_at).toBeTruthy();

      // Verify token was stored
      const { data: invite } = await serviceClient
        .from('list_invites')
        .select('*')
        .eq('token', data[0].token)
        .single();

      expect(invite.list_id).toBe(listId);
      expect(invite.created_by).toBe(user1Id);
      expect(invite.revoked_at).toBeNull();
    });

    test('should fail if user is not a member of the list', async () => {
      const { error } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user2Id // user2 is not a member
        });

      expect(error).toBeTruthy();
      expect(error.message).toContain('not a member');
    });

    test('should generate unique tokens', async () => {
      const { data: data1 } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });

      const { data: data2 } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });

      expect(data1[0].token).not.toBe(data2[0].token);
    });
  });

  describe('join_list_via_invite()', () => {
    let listId, inviteToken;

    beforeEach(async () => {
      // Setup user1 with a list
      const { data, error } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });
      if (error) throw new Error(`setup_new_user failed: ${error.message}`);
      listId = data;

      // Generate invite
      const { data: inviteData, error: inviteError } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });
      if (inviteError) throw new Error(`generate_list_invite failed: ${inviteError.message}`);
      if (!inviteData || !inviteData[0]) throw new Error('generate_list_invite returned no data');
      inviteToken = inviteData[0].token;
    });

    test('should allow user to join list with valid token', async () => {
      const { data, error } = await serviceClient
        .rpc('join_list_via_invite', {
          p_token: inviteToken,
          p_user_id: user2Id
        });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].list_id).toBe(listId);
      expect(data[0].list_name).toBe('My Shopping List');

      // Verify user2 is now a member
      const { data: member } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .eq('user_id', user2Id)
        .single();

      expect(member).toBeTruthy();
      expect(member.is_active).toBe(false); // Not active by default
    });

    test('should fail with invalid token', async () => {
      const { error } = await serviceClient
        .rpc('join_list_via_invite', {
          p_token: 'invalid-token-123',
          p_user_id: user2Id
        });

      expect(error).toBeTruthy();
      expect(error.message).toContain('Invalid invite token');
    });

    test('should fail with revoked token', async () => {
      // Revoke the invite
      await serviceClient
        .rpc('revoke_list_invites', { p_list_id: listId });

      const { error } = await serviceClient
        .rpc('join_list_via_invite', {
          p_token: inviteToken,
          p_user_id: user2Id
        });

      expect(error).toBeTruthy();
      expect(error.message).toContain('revoked');
    });

    test('should be idempotent - return success if already a member', async () => {
      // Join first time
      await serviceClient
        .rpc('join_list_via_invite', {
          p_token: inviteToken,
          p_user_id: user2Id
        });

      // Join again
      const { data, error } = await serviceClient
        .rpc('join_list_via_invite', {
          p_token: inviteToken,
          p_user_id: user2Id
        });

      expect(error).toBeNull();
      expect(data[0].list_id).toBe(listId);

      // Should still only have 1 membership
      const { data: members } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .eq('user_id', user2Id);

      expect(members).toHaveLength(1);
    });
  });

  describe('revoke_list_invites()', () => {
    let listId;

    beforeEach(async () => {
      // Setup user1 with a list
      const { data, error } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });
      if (error) throw new Error(`setup_new_user failed: ${error.message}`);
      listId = data;
    });

    test('should revoke all active invites for a list', async () => {
      // Generate 3 invites
      await serviceClient.rpc('generate_list_invite', {
        p_list_id: listId,
        p_user_id: user1Id
      });
      await serviceClient.rpc('generate_list_invite', {
        p_list_id: listId,
        p_user_id: user1Id
      });
      await serviceClient.rpc('generate_list_invite', {
        p_list_id: listId,
        p_user_id: user1Id
      });

      // Revoke all
      const { data: revokedCount, error } = await serviceClient
        .rpc('revoke_list_invites', { p_list_id: listId });

      expect(error).toBeNull();
      expect(revokedCount).toBe(3);

      // Verify all invites are revoked
      const { data: invites } = await serviceClient
        .from('list_invites')
        .select('*')
        .eq('list_id', listId);

      invites.forEach(invite => {
        expect(invite.revoked_at).toBeTruthy();
      });
    });

    test('should return 0 if no active invites', async () => {
      const { data: revokedCount } = await serviceClient
        .rpc('revoke_list_invites', { p_list_id: listId });

      expect(revokedCount).toBe(0);
    });
  });

  describe('leave_list()', () => {
    let listId;

    beforeEach(async () => {
      // Setup user1 with a list
      const { data, error } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });
      if (error) throw new Error(`setup_new_user failed: ${error.message}`);
      listId = data;
    });

    test('should remove user from list', async () => {
      // Add user2 to the list
      const { data: inviteData, error: inviteError } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });
      expect(inviteError).toBeNull();
      expect(inviteData).toHaveLength(1);

      await serviceClient.rpc('join_list_via_invite', {
        p_token: inviteData[0].token,
        p_user_id: user2Id
      });

      // User2 leaves
      const { data, error } = await serviceClient
        .rpc('leave_list', {
          p_list_id: listId,
          p_user_id: user2Id
        });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].was_last_member).toBe(false);
      expect(data[0].list_deleted).toBe(false);

      // Verify user2 is no longer a member
      const { data: member } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', listId)
        .eq('user_id', user2Id)
        .single();

      expect(member).toBeNull();

      // List should still exist (user1 is still a member)
      const { data: list } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      expect(list).toBeTruthy();
    });

    test('should delete list when last member leaves', async () => {
      // User1 leaves (they are the only member)
      const { data, error } = await serviceClient
        .rpc('leave_list', {
          p_list_id: listId,
          p_user_id: user1Id
        });

      expect(error).toBeNull();
      expect(data[0].was_last_member).toBe(true);
      expect(data[0].list_deleted).toBe(true);

      // Verify list was deleted
      const { data: list } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      expect(list).toBeNull();

      // Verify aisles were also deleted (CASCADE)
      const { data: aisles } = await serviceClient
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId);

      expect(aisles).toHaveLength(0);
    });

    test('should fail if user is not a member', async () => {
      const { error } = await serviceClient
        .rpc('leave_list', {
          p_list_id: listId,
          p_user_id: user2Id
        });

      expect(error).toBeTruthy();
      expect(error.message).toContain('not a member');
    });
  });
});
