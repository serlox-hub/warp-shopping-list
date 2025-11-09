/**
 * Database Integration Tests - Triggers
 *
 * Tests database triggers:
 * - cleanup_empty_lists (auto-delete orphaned lists)
 * - ensure_one_active_list (maintain one active list per user)
 * - increment_purchase_count (track item completions)
 * - handle_updated_at (automatic timestamps)
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  createServiceClient,
  createTestUser,
  cleanDatabase
} from '../helpers/supabase-test-client';

describe('Database Triggers', () => {
  let serviceClient;
  let user1Id, user2Id;

  beforeAll(async () => {
    serviceClient = createServiceClient();
    user1Id = await createTestUser(serviceClient, 'user1');
    user2Id = await createTestUser(serviceClient, 'user2');
  });

  beforeEach(async () => {
    await cleanDatabase(serviceClient);

    // Recreate test users (cleanDatabase removes them)
    await createTestUser(serviceClient, 'user1');
    await createTestUser(serviceClient, 'user2');
  });

  describe('cleanup_empty_lists trigger', () => {
    test('should delete list when last member leaves', async () => {
      // Setup user1 with a list
      const { data: listId } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Verify list exists
      let { data: list } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();
      expect(list).toBeTruthy();

      // User1 leaves (last member)
      await serviceClient
        .from('list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user1Id);

      // List should be automatically deleted
      const { data: deletedList } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();
      expect(deletedList).toBeNull();
    });

    test('should NOT delete list when non-last member leaves', async () => {
      // Setup user1 with a list
      const { data: listId } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Add user2 to the list
      const { data: inviteData } = await serviceClient
        .rpc('generate_list_invite', {
          p_list_id: listId,
          p_user_id: user1Id
        });
      await serviceClient.rpc('join_list_via_invite', {
        p_token: inviteData[0].token,
        p_user_id: user2Id
      });

      // User2 leaves (not last member)
      await serviceClient
        .from('list_members')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user2Id);

      // List should still exist
      const { data: list } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();
      expect(list).toBeTruthy();

      // User1 should still be a member
      const { data: members } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', listId);
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(user1Id);
    });

    test('should CASCADE delete items and aisles when list is deleted', async () => {
      // Setup user1 with a list
      const { data: listId } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Add some items
      await serviceClient
        .from('shopping_items')
        .insert([
          { shopping_list_id: listId, name: 'Item 1', quantity: 1 },
          { shopping_list_id: listId, name: 'Item 2', quantity: 1 }
        ]);

      // Verify items and aisles exist
      const { data: itemsBefore } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('shopping_list_id', listId);
      const { data: aislesBefore } = await serviceClient
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId);

      expect(itemsBefore).toHaveLength(2);
      expect(aislesBefore).toHaveLength(9); // 9 default aisles

      // Delete last member (triggers list deletion)
      await serviceClient
        .from('list_members')
        .delete()
        .eq('list_id', listId);

      // Items and aisles should also be deleted
      const { data: itemsAfter } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('shopping_list_id', listId);
      const { data: aislesAfter } = await serviceClient
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId);

      expect(itemsAfter).toHaveLength(0);
      expect(aislesAfter).toHaveLength(0);
    });
  });

  describe('ensure_one_active_list trigger', () => {
    test('should deactivate other lists when setting one as active', async () => {
      // Setup user1 with initial list
      const { data: list1Id } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Create second list for user1
      const { data: list2 } = await serviceClient
        .from('shopping_lists')
        .insert({ name: 'Second List', created_by: user1Id })
        .select()
        .single();

      await serviceClient
        .from('list_members')
        .insert({ list_id: list2.id, user_id: user1Id, is_active: false });

      // Set second list as active
      await serviceClient
        .from('list_members')
        .update({ is_active: true })
        .eq('list_id', list2.id)
        .eq('user_id', user1Id);

      // Check that first list is now inactive
      const { data: member1 } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', list1Id)
        .eq('user_id', user1Id)
        .single();

      expect(member1.is_active).toBe(false);

      // Check that second list is active
      const { data: member2 } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('list_id', list2.id)
        .eq('user_id', user1Id)
        .single();

      expect(member2.is_active).toBe(true);
    });

    test('should ensure user always has one active list', async () => {
      // Setup user1 with two lists
      const { data: list1Id } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      const { data: list2 } = await serviceClient
        .from('shopping_lists')
        .insert({ name: 'Second List', created_by: user1Id })
        .select()
        .single();

      await serviceClient
        .from('list_members')
        .insert({ list_id: list2.id, user_id: user1Id, is_active: false });

      // Try to deactivate the only active list
      await serviceClient
        .from('list_members')
        .update({ is_active: false })
        .eq('list_id', list1Id)
        .eq('user_id', user1Id);

      // The trigger should automatically activate another list
      const { data: members } = await serviceClient
        .from('list_members')
        .select('*')
        .eq('user_id', user1Id)
        .eq('is_active', true);

      // Should have exactly 1 active list
      expect(members).toHaveLength(1);
    });
  });

  describe('increment_purchase_count trigger', () => {
    let listId, itemId;

    beforeEach(async () => {
      // Setup user1 with a list
      const { data } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });
      listId = data;

      // Add an item
      const { data: item } = await serviceClient
        .from('shopping_items')
        .insert({
          shopping_list_id: listId,
          name: 'Test Item',
          quantity: 1,
          completed: false,
          purchase_count: 0
        })
        .select()
        .single();

      itemId = item.id;
    });

    test('should increment purchase_count when item is marked as completed', async () => {
      // Mark as completed
      await serviceClient
        .from('shopping_items')
        .update({ completed: true })
        .eq('id', itemId);

      // Check purchase_count incremented
      const { data: item } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('id', itemId)
        .single();

      expect(item.purchase_count).toBe(1);
      expect(item.last_purchased_at).toBeTruthy();
    });

    test('should NOT increment when already completed', async () => {
      // Mark as completed first time
      await serviceClient
        .from('shopping_items')
        .update({ completed: true })
        .eq('id', itemId);

      // Update something else while still completed
      await serviceClient
        .from('shopping_items')
        .update({ quantity: 2 })
        .eq('id', itemId);

      // Purchase count should still be 1
      const { data: item } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('id', itemId)
        .single();

      expect(item.purchase_count).toBe(1);
    });

    test('should increment again when re-completed', async () => {
      // Complete
      await serviceClient
        .from('shopping_items')
        .update({ completed: true })
        .eq('id', itemId);

      // Uncomplete
      await serviceClient
        .from('shopping_items')
        .update({ completed: false })
        .eq('id', itemId);

      // Complete again
      await serviceClient
        .from('shopping_items')
        .update({ completed: true })
        .eq('id', itemId);

      // Purchase count should be 2
      const { data: item } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('id', itemId)
        .single();

      expect(item.purchase_count).toBe(2);
    });
  });

  describe('handle_updated_at trigger', () => {
    test('should update updated_at on shopping_lists', async () => {
      // Setup user1 with a list
      const { data: listId } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      // Get initial timestamp
      const { data: listBefore } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      const initialUpdatedAt = listBefore.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the list
      await serviceClient
        .from('shopping_lists')
        .update({ name: 'Updated Name' })
        .eq('id', listId);

      // Check timestamp was updated
      const { data: listAfter } = await serviceClient
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      expect(new Date(listAfter.updated_at).getTime()).toBeGreaterThan(
        new Date(initialUpdatedAt).getTime()
      );
    });

    test('should update updated_at on shopping_items', async () => {
      // Setup
      const { data: listId } = await serviceClient
        .rpc('setup_new_user', { p_user_id: user1Id });

      const { data: item } = await serviceClient
        .from('shopping_items')
        .insert({
          shopping_list_id: listId,
          name: 'Test Item',
          quantity: 1
        })
        .select()
        .single();

      const initialUpdatedAt = item.updated_at;

      await new Promise(resolve => setTimeout(resolve, 100));

      // Update item
      await serviceClient
        .from('shopping_items')
        .update({ quantity: 2 })
        .eq('id', item.id);

      const { data: updatedItem } = await serviceClient
        .from('shopping_items')
        .select('*')
        .eq('id', item.id)
        .single();

      expect(new Date(updatedItem.updated_at).getTime()).toBeGreaterThan(
        new Date(initialUpdatedAt).getTime()
      );
    });
  });
});
