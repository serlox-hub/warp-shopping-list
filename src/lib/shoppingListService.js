import { supabase } from './supabase'
import { getDefaultAisleColor } from '@/types/shoppingList'

const ITEM_USAGE_DELIMITER = '::'

// Table structures needed in Supabase:
// 
// shopping_lists table:
// - id: uuid (primary key)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - created_at: timestamp
// - updated_at: timestamp
//
// shopping_items table:
// - id: uuid (primary key) 
// - shopping_list_id: uuid (foreign key to shopping_lists)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - aisle: text
// - quantity: integer
// - completed: boolean
// - comment: text (optional)
// - created_at: timestamp
// - updated_at: timestamp
//
// user_aisles table:
// - id: uuid (primary key)
// - user_id: uuid (foreign key to auth.users)
// - name: text
// - display_order: integer
// - color: text (hex)
// - created_at: timestamp
// - updated_at: timestamp

export class ShoppingListService {
  // Get all shopping lists for a user
  static async getUserShoppingLists(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('list_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user shopping lists:', error);
      throw error;
    }
  }

  // Get the active shopping list for a user
  static async getActiveShoppingList(userId) {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        // If no active list exists, create a default one
        if (error.code === 'PGRST116') {
          return this.createShoppingList(userId, 'My Shopping List', true);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting active shopping list:', error);
      throw error;
    }
  }

  // Create a new shopping list
  static async createShoppingList(userId, name, setAsActive = false) {
    try {
      // If setting as active, deactivate other lists first
      if (setAsActive) {
        await this.deactivateAllLists(userId);
      }

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([
          {
            user_id: userId,
            name: name.trim(),
            is_active: setAsActive
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating shopping list:', error);
      throw error;
    }
  }

  // Set a list as active (deactivates others)
  static async setActiveList(userId, listId) {
    try {
      // Deactivate all lists for user
      await this.deactivateAllLists(userId);

      // Activate the selected list
      const { data, error } = await supabase
        .from('shopping_lists')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', listId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting active list:', error);
      throw error;
    }
  }

  // Deactivate all lists for a user
  static async deactivateAllLists(userId) {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deactivating lists:', error);
      throw error;
    }
  }

  // Delete a shopping list
  static async deleteShoppingList(userId, listId) {
    try {
      // Check if this is the only list
      const allLists = await this.getUserShoppingLists(userId);
      if (allLists.length === 1) {
        throw new Error('Cannot delete the last remaining list');
      }

      const listToDelete = allLists.find(list => list.id === listId);
      const wasActive = listToDelete?.is_active;

      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', userId);

      if (error) throw error;

      // If we deleted the active list, make the first remaining list active
      if (wasActive) {
        const remainingLists = allLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          await this.setActiveList(userId, remainingLists[0].id);
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      throw error;
    }
  }

  // Update shopping list name
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

  // Get all items for a shopping list
  static async getShoppingItems(listId) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('shopping_list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting shopping items:', error);
      throw error;
    }
  }

  // Add a new shopping item
  static async addShoppingItem(listId, userId, itemData) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert([
          {
            shopping_list_id: listId,
            user_id: userId,
            name: itemData.name,
            aisle: itemData.aisle,
            quantity: itemData.quantity,
            comment: itemData.comment || '',
            completed: false,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      // Fire-and-forget analytics update
      this.recordItemUsage(userId, itemData).catch((usageError) => {
        console.error('Error recording item usage analytics:', usageError);
      });

      return data;
    } catch (error) {
      console.error('Error adding shopping item:', error);
      throw error;
    }
  }

  // Update a shopping item
  static async updateShoppingItem(itemId, updates) {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shopping item:', error);
      throw error;
    }
  }

  // Delete a shopping item
  static async deleteShoppingItem(itemId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  }

  // Clear completed items
  static async clearCompletedItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('shopping_list_id', listId)
        .eq('completed', true);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing completed items:', error);
      throw error;
    }
  }

  // Clear all items
  static async clearAllItems(listId) {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('shopping_list_id', listId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing all items:', error);
      throw error;
    }
  }

  // ============== USER AISLES METHODS ==============

  // Get user's custom aisles
  static async getUserAisles(userId) {
    try {
      const { data, error } = await supabase
        .from('user_aisles')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      // If user has no aisles, create default ones
      if (!data || data.length === 0) {
        await this.createDefaultUserAisles(userId);
        return this.getUserAisles(userId);
      }
      
      return data.map(aisle => ({
        name: aisle.name,
        color: aisle.color || getDefaultAisleColor(aisle.name)
      }));
    } catch (error) {
      console.error('Error getting user aisles:', error);
      throw error;
    }
  }

  // Create default aisles for new user
  static async createDefaultUserAisles(userId) {
    try {
      const { error } = await supabase.rpc('create_default_user_aisles', {
        p_user_id: userId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating default user aisles:', error);
      throw error;
    }
  }

  // Update user's aisles (replace all)
  static async updateUserAisles(userId, aisles) {
    try {
      // Delete existing aisles
      const { error: deleteError } = await supabase
        .from('user_aisles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new aisles
      const aisleData = aisles.map((aisle, index) => ({
        user_id: userId,
        name: aisle.name,
        color: aisle.color || getDefaultAisleColor(aisle.name),
        display_order: index + 1
      }));

      const { data, error } = await supabase
        .from('user_aisles')
        .insert(aisleData)
        .select();

      if (error) throw error;
      return data.map(aisle => ({
        name: aisle.name,
        color: aisle.color || getDefaultAisleColor(aisle.name)
      }));
    } catch (error) {
      console.error('Error updating user aisles:', error);
      throw error;
    }
  }

  // ============== ITEM USAGE ANALYTICS ==============

  static buildItemUsageKey(name, aisle) {
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) return ''

    const sanitizedAisle =
      typeof aisle === 'string' && aisle.trim().length > 0
        ? aisle.trim()
        : null

    return sanitizedAisle ? `${trimmedName}${ITEM_USAGE_DELIMITER}${sanitizedAisle}` : trimmedName
  }

  static parseItemUsageKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
      return { name: '', aisle: null }
    }
    const delimiterIndex = key.indexOf(ITEM_USAGE_DELIMITER)
    if (delimiterIndex === -1) {
      return { name: key, aisle: null }
    }
    const name = key.slice(0, delimiterIndex)
    const aisle = key.slice(delimiterIndex + ITEM_USAGE_DELIMITER.length) || null
    return { name, aisle }
  }

  static mapUsageRow(row) {
    if (!row) return row
    const { name, aisle } = this.parseItemUsageKey(row.item_name)
    return {
      ...row,
      usage_key: row.item_name,
      item_name: name || row.item_name,
      usage_aisle: aisle || row.last_aisle || null
    }
  }

  static async recordItemUsage(userId, itemData) {
    if (!userId || !itemData?.name) return;

    const trimmedName = itemData.name.trim();
    if (!trimmedName) return;

    const usageKey = this.buildItemUsageKey(trimmedName, itemData.aisle);

    try {
      await supabase.rpc('increment_item_usage', {
        p_user_id: userId,
        p_item_name: usageKey || trimmedName,
        p_last_aisle: itemData.aisle ?? null,
        p_last_quantity: itemData.quantity ?? null
      });
    } catch (error) {
      console.error('Error incrementing item usage:', error);
    }
  }

  static async getMostPurchasedItems(userId, limit = 8) {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('shopping_item_usage')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_count', { ascending: false })
        .order('last_purchased_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map((row) => this.mapUsageRow(row));
    } catch (error) {
      console.error('Error fetching most purchased items:', error);
      return [];
    }
  }

  static async getItemUsageHistory(userId, limit = 200) {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('shopping_item_usage')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_count', { ascending: false })
        .order('last_purchased_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map((row) => this.mapUsageRow(row));
    } catch (error) {
      console.error('Error fetching item usage history:', error);
      return [];
    }
  }

  static async updateItemUsageMetadata(userId, itemName, metadata = {}) {
    if (!userId || !itemName) return;

    const previousName = metadata.previousName ?? itemName;
    const previousAisle = metadata.previousAisle ?? metadata.aisle ?? null;
    const targetKey = this.buildItemUsageKey(itemName, metadata.aisle);
    const previousKey = this.buildItemUsageKey(previousName, previousAisle);
    const fallbackPreviousKey = previousName?.trim() || '';

    const payload = {};
    if (metadata.aisle !== undefined) payload.last_aisle = metadata.aisle;
    if (metadata.quantity !== undefined) payload.last_quantity = metadata.quantity;

    const hasUpdates = Object.keys(payload).length > 0 || (targetKey && targetKey !== previousKey);
    if (!hasUpdates) return;

    if (targetKey && targetKey !== previousKey) {
      payload.item_name = targetKey;
    }

    payload.updated_at = new Date().toISOString();

    const attemptUpdate = async (key) => {
      if (!key) return { data: [], error: null };
      return await supabase
        .from('shopping_item_usage')
        .update(payload)
        .eq('user_id', userId)
        .eq('item_name', key)
        .select();
    };

    try {
      let { data, error } = await attemptUpdate(previousKey || fallbackPreviousKey);
      if (error) throw error;

      if ((!data || data.length === 0) && previousKey && previousKey !== fallbackPreviousKey) {
        const fallbackResult = await attemptUpdate(fallbackPreviousKey);
        if (fallbackResult.error) throw fallbackResult.error;
      }
    } catch (error) {
      console.error('Error updating item usage metadata:', error);
    }
  }

  static async renameItemUsage(userId, oldName, newName, metadata = {}) {
    if (!userId || !oldName || !newName) return;

    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();

    if (!trimmedOld || !trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) {
      return;
    }

    const oldAisle = metadata.oldAisle ?? metadata.previousAisle ?? metadata.aisle ?? null;
    const newAisle = metadata.newAisle ?? metadata.aisle ?? oldAisle;

    const oldKey = this.buildItemUsageKey(trimmedOld, oldAisle);
    const fallbackOldKey = trimmedOld;
    const newKey = this.buildItemUsageKey(trimmedNew, newAisle);
    const fallbackNewKey = trimmedNew;

    const fetchUsage = async (key) => {
      return await supabase
        .from('shopping_item_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('item_name', key)
        .single();
    };

    try {
      let { data: oldUsage, error: oldError } = await fetchUsage(oldKey || fallbackOldKey);
      if (oldError && oldError.code === 'PGRST116' && oldKey && oldKey !== fallbackOldKey) {
        const fallbackOldResult = await fetchUsage(fallbackOldKey);
        oldUsage = fallbackOldResult.data;
        oldError = fallbackOldResult.error;
      }

      if (oldError) {
        await this.updateItemUsageMetadata(userId, trimmedNew, {
          ...metadata,
          previousName: trimmedOld,
          previousAisle: oldAisle,
          aisle: newAisle
        });
        return;
      }

      const { data: newUsage, error: newError } = await fetchUsage(newKey || fallbackNewKey);

      if (newError && newError.code !== 'PGRST116') {
        throw newError;
      }

      if (newUsage) {
        const combinedCount = (newUsage.purchase_count || 0) + (oldUsage.purchase_count || 0);
        const latestPurchaseAt = new Date(
          Math.max(
            new Date(newUsage.last_purchased_at || 0).getTime(),
            new Date(oldUsage.last_purchased_at || 0).getTime()
          )
        ).toISOString();

        const { error: mergeError } = await supabase
          .from('shopping_item_usage')
          .update({
            item_name: newKey || fallbackNewKey,
            purchase_count: combinedCount,
            last_aisle: newAisle ?? oldUsage.last_aisle ?? newUsage.last_aisle,
            last_quantity: metadata.quantity ?? oldUsage.last_quantity ?? newUsage.last_quantity,
            last_purchased_at: latestPurchaseAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', newUsage.id);

        if (mergeError) throw mergeError;

        await supabase
          .from('shopping_item_usage')
          .delete()
          .eq('id', oldUsage.id);

        return;
      }

      const { error: renameError } = await supabase
        .from('shopping_item_usage')
        .update({
          item_name: newKey || fallbackNewKey,
          last_aisle: newAisle ?? oldUsage.last_aisle,
          last_quantity: metadata.quantity ?? oldUsage.last_quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', oldUsage.id);

      if (renameError) throw renameError;
    } catch (error) {
      console.error('Error renaming item usage:', error);
    }
  }
}
