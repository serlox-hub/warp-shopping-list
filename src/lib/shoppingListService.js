import { supabase } from './supabase'
import { getDefaultAisleColor } from '@/types/shoppingList'

export class ShoppingListService {
  // ============================================================================
  // LIST QUERY METHODS (using list_members junction table)
  // ============================================================================

  static async getUserShoppingLists(userId) {
    try {
      const { data, error } = await supabase
        .from('list_members')
        .select(`
          is_active,
          joined_at,
          shopping_lists (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Flatten the response to match expected format
      return (data || []).map(membership => ({
        ...membership.shopping_lists,
        is_active: membership.is_active,
        joined_at: membership.joined_at
      }));
    } catch (error) {
      console.error('Error getting user shopping lists:', error);
      throw error;
    }
  }

  static async getActiveShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('list_members')
        .select(`
          is_active,
          joined_at,
          shopping_lists (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active list found - setup new user
          await this.setupNewUser(userId);
          return this.getActiveShoppingList(userId);
        }
        throw error;
      }

      return {
        ...data.shopping_lists,
        is_active: data.is_active,
        joined_at: data.joined_at
      };
    } catch (error) {
      console.error('Error getting active shopping list:', error);
      throw error;
    }
  }

  static async getActiveShoppingListWithItems(userId) {
    try {
      // First get the active list membership
      const { data: membership, error: memberError } = await supabase
        .from('list_members')
        .select(`
          is_active,
          joined_at,
          shopping_lists (
            id,
            name,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          // No active list - setup new user
          await this.setupNewUser(userId);
          return this.getActiveShoppingListWithItems(userId);
        }
        throw memberError;
      }

      const listId = membership.shopping_lists.id;

      // Get items with list_aisles and supermarket
      const { data: items, error: itemsError } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      return {
        list: {
          ...membership.shopping_lists,
          is_active: membership.is_active,
          joined_at: membership.joined_at
        },
        items: items || []
      };
    } catch (error) {
      console.error('Error getting active shopping list with items:', error);
      throw error;
    }
  }

  static async setupNewUser(userId) {
    try {
      const { data, error } = await supabase.rpc('setup_new_user', {
        p_user_id: userId
      });

      if (error) throw error;
      return data; // Returns the list ID
    } catch (error) {
      console.error('Error setting up new user:', error);
      throw error;
    }
  }

  static async createShoppingList(userId, name, setAsActive = false) {
    try {
      // Use RPC function to create list (bypasses RLS issues)
      const { data: listId, error: createError } = await supabase.rpc('create_shopping_list', {
        p_user_id: userId,
        p_name: name.trim(),
        p_set_active: setAsActive
      });

      if (createError) throw createError;

      // Create default aisles for the list
      await this.createDefaultListAisles(listId);

      // Fetch the created list to return full data
      const { data: list, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (fetchError) throw fetchError;

      return { ...list, is_active: setAsActive };
    } catch (error) {
      console.error('Error creating shopping list:', error);
      throw error;
    }
  }

  static async setActiveList(userId, listId) {
    try {
      // The trigger ensure_one_active_list will deactivate other lists
      const { error } = await supabase
        .from('list_members')
        .update({ is_active: true })
        .eq('list_id', listId)
        .eq('user_id', userId);

      if (error) throw error;

      return this.getActiveShoppingList(userId);
    } catch (error) {
      console.error('Error setting active list:', error);
      throw error;
    }
  }

  static async deactivateAllLists(userId) {
    try {
      const { error } = await supabase
        .from('list_members')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deactivating lists:', error);
      throw error;
    }
  }

  static async updateShoppingListName(listId, name) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping list name:', error);
      throw error;
    }
  }

  // ============================================================================
  // SHOPPING ITEMS METHODS (no user_id, uses list_aisles)
  // ============================================================================

  static async getShoppingItems(listId) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting shopping items:', error);
      throw error;
    }
  }

  static async addShoppingItem(listId, itemData) {
    try {
      // Check for existing inactive item with same name (for reactivation)
      const { data: existingItem } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('name', itemData.name)
        .eq('active', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingItem) {
        // Reactivate existing item
        const { data, error } = await supabase
          .from('shopping_items')
          .update({
            active: true,
            aisle_id: itemData.aisle_id || existingItem.aisle_id,
            supermarket_id: itemData.supermarket_id !== undefined ? itemData.supermarket_id : existingItem.supermarket_id,
            quantity: itemData.quantity || 1,
            comment: itemData.comment || '',
            completed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)
          .select(`
            *,
            aisle:list_aisles (
              id,
              name,
              color,
              display_order
            ),
            supermarket:list_supermarkets (
              id,
              name,
              color,
              display_order
            )
          `)
          .single();

        if (error) throw error;
        return data;
      }

      // Create new item
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([{
          shopping_list_id: listId,
          name: itemData.name,
          aisle_id: itemData.aisle_id || null,
          supermarket_id: itemData.supermarket_id || null,
          quantity: itemData.quantity || 1,
          comment: itemData.comment || '',
          completed: false,
          purchase_count: 0,
          active: true
        }])
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding shopping item:', error);
      throw error;
    }
  }

  static async updateShoppingItem(itemId, updates) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping item:', error);
      throw error;
    }
  }

  static async deleteShoppingItem(itemId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  }

  static async clearCompletedItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('shopping_list_id', listId)
        .eq('completed', true)
        .eq('active', true);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing completed items:', error);
      throw error;
    }
  }

  static async clearAllItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('shopping_list_id', listId)
        .eq('active', true);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing all items:', error);
      throw error;
    }
  }

  // ============================================================================
  // LIST AISLES METHODS (replaces user_aisles)
  // ============================================================================

  static async getListAisles(listId) {
    try {
      const { data, error } = await supabase
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        await this.createDefaultListAisles(listId);
        return this.getListAisles(listId);
      }

      return data.map(aisle => ({
        id: aisle.id,
        name: aisle.name,
        color: aisle.color || getDefaultAisleColor(aisle.name),
        display_order: aisle.display_order
      }));
    } catch (error) {
      console.error('Error getting list aisles:', error);
      throw error;
    }
  }

  static async createDefaultListAisles(listId) {
    try {
      const { error } = await supabase.rpc('create_default_list_aisles', {
        p_list_id: listId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating default list aisles:', error);
      throw error;
    }
  }

  static async updateListAisles(listId, aisles) {
    try {
      const { data: existingAisles, error: fetchError } = await supabase
        .from('list_aisles')
        .select('*')
        .eq('list_id', listId);

      if (fetchError) throw fetchError;

      const existingAislesMap = new Map(
        (existingAisles || []).map(aisle => [aisle.id, aisle])
      );

      const incomingAisleIds = new Set(
        aisles.filter(a => a.id).map(a => a.id)
      );

      const operations = [];

      for (let index = 0; index < aisles.length; index++) {
        const aisle = aisles[index];

        if (aisle.id && existingAislesMap.has(aisle.id)) {
          const existing = existingAislesMap.get(aisle.id);
          operations.push(
            supabase
              .from('list_aisles')
              .update({
                name: aisle.name,
                color: aisle.color || existing.color || getDefaultAisleColor(aisle.name),
                display_order: aisle.display_order ?? index + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', aisle.id)
          );
        } else {
          operations.push(
            supabase
              .from('list_aisles')
              .insert({
                list_id: listId,
                name: aisle.name,
                color: aisle.color || getDefaultAisleColor(aisle.name),
                display_order: aisle.display_order ?? index + 1
              })
          );
        }
      }

      const aislesToDelete = existingAisles.filter(
        existing => !incomingAisleIds.has(existing.id)
      );

      if (aislesToDelete.length > 0) {
        const idsToDelete = aislesToDelete.map(a => a.id);
        operations.push(
          supabase
            .from('list_aisles')
            .delete()
            .in('id', idsToDelete)
        );
      }

      await Promise.all(operations);

      return this.getListAisles(listId);
    } catch (error) {
      console.error('Error updating list aisles:', error);
      throw error;
    }
  }

  // Legacy method name for backward compatibility
  static async getUserAisles(userId) {
    console.warn('getUserAisles is deprecated, use getListAisles instead');
    // This will fail without a listId - components need to be updated
    throw new Error('getUserAisles is deprecated. Use getListAisles(listId) instead.');
  }

  // ============================================================================
  // PURCHASE HISTORY METHODS (list-scoped, no user_id)
  // ============================================================================

  static async getMostPurchasedItems(listId, limit = 8) {
    if (!listId) return [];

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select(`
          id,
          name,
          quantity,
          purchase_count,
          last_purchased_at,
          supermarket_id,
          aisle:list_aisles (
            id,
            name,
            color
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color
          )
        `)
        .eq('shopping_list_id', listId)
        .gt('purchase_count', 0)
        .order('purchase_count', { ascending: false })
        .order('last_purchased_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most purchased items:', error);
      return [];
    }
  }

  static async deleteFromPurchaseHistory(listId, itemName) {
    if (!listId || !itemName) return false;

    try {
      const operations = [];

      // Reset purchase_count on active items
      operations.push(
        supabase
          .from('shopping_items')
          .update({
            purchase_count: 0,
            last_purchased_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('shopping_list_id', listId)
          .eq('name', itemName)
          .eq('active', true)
      );

      // Delete inactive items
      operations.push(
        supabase
          .from('shopping_items')
          .delete()
          .eq('shopping_list_id', listId)
          .eq('name', itemName)
          .eq('active', false)
      );

      const results = await Promise.all(operations);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting from purchase history:', error);
      throw error;
    }
  }

  // ============================================================================
  // SHARING METHODS
  // ============================================================================

  static async generateShareLink(listId, userId) {
    try {
      const { data, error } = await supabase.rpc('generate_list_invite', {
        p_list_id: listId,
        p_user_id: userId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Failed to generate invite');
      }

      const invite = data[0];
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      return {
        token: invite.token,
        url: `${baseUrl}/join/${invite.token}`,
        expiresAt: invite.expires_at
      };
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  }

  static async revokeShareLink(listId) {
    try {
      const { data, error } = await supabase.rpc('revoke_list_invites', {
        p_list_id: listId
      });

      if (error) throw error;
      return data; // Returns count of revoked invites
    } catch (error) {
      console.error('Error revoking share link:', error);
      throw error;
    }
  }

  static async getActiveShareLink(listId) {
    try {
      const { data, error } = await supabase
        .from('list_invites')
        .select('*')
        .eq('list_id', listId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      return {
        token: data.token,
        url: `${baseUrl}/join/${data.token}`,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting active share link:', error);
      throw error;
    }
  }

  static async joinListViaInvite(token, userId) {
    try {
      const { data, error } = await supabase.rpc('join_list_via_invite', {
        p_token: token,
        p_user_id: userId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Failed to join list');
      }

      const result = data[0];

      // Set the new list as active for this user
      await this.setActiveList(userId, result.list_id);

      return {
        listId: result.list_id,
        listName: result.list_name,
        joinedAt: result.joined_at
      };
    } catch (error) {
      console.error('Error joining list via invite:', error);
      throw error;
    }
  }

  static async leaveList(listId, userId) {
    try {
      const { data, error } = await supabase.rpc('leave_list', {
        p_list_id: listId,
        p_user_id: userId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Failed to leave list');
      }

      const result = data[0];

      // If user has other lists and none is active, activate one
      const lists = await this.getUserShoppingLists(userId);
      if (lists.length > 0 && !lists.some(l => l.is_active)) {
        await this.setActiveList(userId, lists[0].id);
      }

      return {
        wasLastMember: result.was_last_member,
        listDeleted: result.list_deleted
      };
    } catch (error) {
      console.error('Error leaving list:', error);
      throw error;
    }
  }

  static async getListMembers(listId, userId) {
    try {
      const { data, error } = await supabase.rpc('get_list_members', {
        p_list_id: listId,
        p_user_id: userId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting list members:', error);
      throw error;
    }
  }

  static async isListShared(listId, userId) {
    try {
      const members = await this.getListMembers(listId, userId);
      return members.length > 1;
    } catch (error) {
      console.error('Error checking if list is shared:', error);
      return false;
    }
  }

  // ============================================================================
  // REFRESH METHOD (for manual sync in collaborative lists)
  // ============================================================================

  static async refreshList(listId, userId) {
    try {
      // Fetch list metadata
      const { data: list, error: listError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (listError) throw listError;

      // Fetch items with aisles and supermarket
      const { data: items, error: itemsError } = await supabase
        .from('shopping_items')
        .select(`
          *,
          aisle:list_aisles (
            id,
            name,
            color,
            display_order
          ),
          supermarket:list_supermarkets (
            id,
            name,
            color,
            display_order
          )
        `)
        .eq('shopping_list_id', listId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch aisles
      const aisles = await this.getListAisles(listId);

      // Fetch members (only if userId provided)
      const members = userId ? await this.getListMembers(listId, userId) : [];

      return {
        list,
        items: items || [],
        aisles,
        members
      };
    } catch (error) {
      console.error('Error refreshing list:', error);
      throw error;
    }
  }

  // Legacy method - redirect to leaveList
  static async deleteShoppingList(userId, listId) {
    console.warn('deleteShoppingList is deprecated, use leaveList instead');
    return this.leaveList(listId, userId);
  }

  // ============================================================================
  // LIST SUPERMARKETS METHODS
  // ============================================================================

  static async getListSupermarkets(listId) {
    try {
      const { data, error } = await supabase
        .from('list_supermarkets')
        .select('*')
        .eq('list_id', listId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(supermarket => ({
        id: supermarket.id,
        name: supermarket.name,
        color: supermarket.color || '#6b7280',
        display_order: supermarket.display_order
      }));
    } catch (error) {
      console.error('Error getting list supermarkets:', error);
      throw error;
    }
  }

  static async updateListSupermarkets(listId, supermarkets) {
    try {
      const { data: existingSupermarkets, error: fetchError } = await supabase
        .from('list_supermarkets')
        .select('*')
        .eq('list_id', listId);

      if (fetchError) throw fetchError;

      const existingSupermarketsMap = new Map(
        (existingSupermarkets || []).map(s => [s.id, s])
      );

      const incomingSupermarketIds = new Set(
        supermarkets.filter(s => s.id).map(s => s.id)
      );

      const operations = [];

      for (let index = 0; index < supermarkets.length; index++) {
        const supermarket = supermarkets[index];

        if (supermarket.id && existingSupermarketsMap.has(supermarket.id)) {
          const existing = existingSupermarketsMap.get(supermarket.id);
          operations.push(
            supabase
              .from('list_supermarkets')
              .update({
                name: supermarket.name,
                color: supermarket.color || existing.color || '#6b7280',
                display_order: supermarket.display_order ?? index + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', supermarket.id)
          );
        } else {
          operations.push(
            supabase
              .from('list_supermarkets')
              .insert({
                list_id: listId,
                name: supermarket.name,
                color: supermarket.color || '#6b7280',
                display_order: supermarket.display_order ?? index + 1
              })
          );
        }
      }

      const supermarketsToDelete = existingSupermarkets.filter(
        existing => !incomingSupermarketIds.has(existing.id)
      );

      if (supermarketsToDelete.length > 0) {
        const idsToDelete = supermarketsToDelete.map(s => s.id);
        operations.push(
          supabase
            .from('list_supermarkets')
            .delete()
            .in('id', idsToDelete)
        );
      }

      await Promise.all(operations);

      return this.getListSupermarkets(listId);
    } catch (error) {
      console.error('Error updating list supermarkets:', error);
      throw error;
    }
  }

}
