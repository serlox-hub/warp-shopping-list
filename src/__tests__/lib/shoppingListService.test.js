import { ShoppingListService } from '../../lib/shoppingListService'
import { supabase } from '../../lib/supabase'
import { getDefaultAisleColor } from '../../types/shoppingList'

// Mock external dependencies
jest.mock('../../lib/supabase')

const mockSupabase = supabase

describe('ShoppingListService', () => {
  const mockUserId = 'user-123'
  const mockListId = 'list-123'
  const mockItemId = 'item-123'
  const mockAisleId = 'aisle-123'

  // New data model - shopping lists have created_by instead of user_id
  const mockShoppingList = {
    id: mockListId,
    name: 'My Shopping List',
    created_by: mockUserId,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  // List membership data (from list_members table)
  const mockMembership = {
    is_active: true,
    joined_at: '2024-01-01T00:00:00.000Z',
    shopping_lists: mockShoppingList
  }

  // Aisles are now list-scoped (list_aisles table)
  const mockAisle = {
    id: mockAisleId,
    list_id: mockListId,
    name: 'Produce',
    color: '#22c55e',
    display_order: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  // Items no longer have user_id
  const mockShoppingItem = {
    id: mockItemId,
    shopping_list_id: mockListId,
    name: 'Apples',
    aisle_id: mockAisleId,
    quantity: 3,
    comment: '',
    completed: false,
    purchase_count: 0,
    active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    last_purchased_at: null,
    aisle: {
      id: mockAisleId,
      name: 'Produce',
      color: '#22c55e',
      display_order: 1
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const createBasicMock = () => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: null, error: null })
    })

    mockSupabase.from = jest.fn().mockReturnValue(createBasicMock())
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ============================================================================
  // LIST QUERY METHODS (using list_members)
  // ============================================================================

  describe('getUserShoppingLists', () => {
    it('should return user shopping lists via list_members', async () => {
      const mockMemberships = [mockMembership]
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockMemberships,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getUserShoppingLists(mockUserId)

      expect(result).toEqual([{
        ...mockShoppingList,
        is_active: true,
        joined_at: '2024-01-01T00:00:00.000Z'
      }])
      expect(mockSupabase.from).toHaveBeenCalledWith('list_members')
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })

      await expect(ShoppingListService.getUserShoppingLists(mockUserId)).rejects.toThrow()
    })
  })

  describe('getActiveShoppingList', () => {
    it('should return active shopping list via list_members', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockMembership,
                error: null
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getActiveShoppingList(mockUserId)

      expect(result).toEqual({
        ...mockShoppingList,
        is_active: true,
        joined_at: '2024-01-01T00:00:00.000Z'
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('list_members')
    })

    it('should call setupNewUser if no active list found', async () => {
      // First call returns no data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      })

      // Mock RPC for setup_new_user
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockListId, error: null })

      // Second call returns the new list
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockMembership,
                error: null
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getActiveShoppingList(mockUserId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('setup_new_user', { p_user_id: mockUserId })
    })
  })

  describe('setupNewUser', () => {
    it('should call the setup_new_user RPC function', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: mockListId, error: null })

      const result = await ShoppingListService.setupNewUser(mockUserId)

      expect(result).toBe(mockListId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('setup_new_user', { p_user_id: mockUserId })
    })
  })

  describe('createShoppingList', () => {
    it('should create a new shopping list with membership via RPC', async () => {
      const newListId = 'new-list-123'
      const newList = { ...mockShoppingList, id: newListId }

      // Mock RPC call to create_shopping_list
      mockSupabase.rpc.mockResolvedValueOnce({ data: newListId, error: null })

      // Mock createDefaultListAisles RPC call
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      // Mock fetch of created list
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newList, error: null })
          })
        })
      })

      const result = await ShoppingListService.createShoppingList(mockUserId, 'Test List', true)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_shopping_list', {
        p_user_id: mockUserId,
        p_name: 'Test List',
        p_set_active: true
      })
      expect(result.id).toBe(newListId)
      expect(result.is_active).toBe(true)
    })
  })

  describe('setActiveList', () => {
    it('should update list_members to set list as active', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockMembership, error: null })
              })
            })
          })
        })

      const result = await ShoppingListService.setActiveList(mockUserId, mockListId)

      expect(mockSupabase.from).toHaveBeenCalledWith('list_members')
    })
  })

  // ============================================================================
  // SHOPPING ITEMS METHODS
  // ============================================================================

  describe('getShoppingItems', () => {
    it('should return active items for a list with list_aisles', async () => {
      const mockItems = [mockShoppingItem]
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockItems,
                error: null
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getShoppingItems(mockListId)

      expect(result).toEqual(mockItems)
      expect(mockSupabase.from).toHaveBeenCalledWith('shopping_items')
    })
  })

  describe('addShoppingItem', () => {
    it('should add a new item (no user_id parameter)', async () => {
      const itemData = { name: 'Bananas', aisle_id: mockAisleId, quantity: 2 }
      const newItem = { ...mockShoppingItem, ...itemData, id: 'new-item' }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
                    })
                  })
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: newItem, error: null })
            })
          })
        })

      const result = await ShoppingListService.addShoppingItem(mockListId, itemData)

      expect(result.name).toBe('Bananas')
    })

    it('should reactivate existing inactive item', async () => {
      const existingItem = { ...mockShoppingItem, active: false }
      const itemData = { name: 'Apples', quantity: 5 }

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({ data: existingItem, error: null })
                    })
                  })
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { ...existingItem, active: true, quantity: 5 }, error: null })
              })
            })
          })
        })

      const result = await ShoppingListService.addShoppingItem(mockListId, itemData)

      expect(result.active).toBe(true)
    })
  })

  describe('updateShoppingItem', () => {
    it('should update item and return with list_aisles', async () => {
      const updates = { quantity: 5 }
      const updatedItem = { ...mockShoppingItem, quantity: 5 }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: updatedItem, error: null })
            })
          })
        })
      })

      const result = await ShoppingListService.updateShoppingItem(mockItemId, updates)

      expect(result.quantity).toBe(5)
    })
  })

  describe('deleteShoppingItem', () => {
    it('should soft delete by setting active to false', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      const result = await ShoppingListService.deleteShoppingItem(mockItemId)

      expect(result).toBe(true)
    })
  })

  describe('clearCompletedItems', () => {
    it('should set active to false for completed items', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      })

      const result = await ShoppingListService.clearCompletedItems(mockListId)

      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // LIST AISLES METHODS (replaces user_aisles)
  // ============================================================================

  describe('getListAisles', () => {
    it('should return aisles for a list', async () => {
      const mockAisles = [mockAisle]
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAisles,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getListAisles(mockListId)

      expect(result[0].name).toBe('Produce')
      expect(mockSupabase.from).toHaveBeenCalledWith('list_aisles')
    })

    it('should create default aisles if none exist', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [mockAisle], error: null })
            })
          })
        })

      const result = await ShoppingListService.getListAisles(mockListId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_default_list_aisles', { p_list_id: mockListId })
    })
  })

  describe('createDefaultListAisles', () => {
    it('should call the RPC function', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      const result = await ShoppingListService.createDefaultListAisles(mockListId)

      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_default_list_aisles', { p_list_id: mockListId })
    })
  })

  // ============================================================================
  // PURCHASE HISTORY METHODS (list-scoped)
  // ============================================================================

  describe('getMostPurchasedItems', () => {
    it('should return most purchased items for a list (no userId parameter)', async () => {
      const mockPurchasedItems = [
        { ...mockShoppingItem, purchase_count: 10 },
        { ...mockShoppingItem, id: 'item-2', name: 'Bananas', purchase_count: 5 }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: mockPurchasedItems, error: null })
                })
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getMostPurchasedItems(mockListId)

      expect(result).toHaveLength(2)
      expect(result[0].purchase_count).toBe(10)
    })

    it('should return empty array if listId is not provided', async () => {
      const result = await ShoppingListService.getMostPurchasedItems(null)
      expect(result).toEqual([])
    })
  })

  describe('deleteFromPurchaseHistory', () => {
    it('should reset purchase_count and delete inactive items (no userId)', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })

      const result = await ShoppingListService.deleteFromPurchaseHistory(mockListId, 'Apples')

      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // SHARING METHODS
  // ============================================================================

  describe('generateShareLink', () => {
    it('should generate a share link via RPC', async () => {
      const mockInvite = {
        invite_id: 'invite-123',
        token: 'abc123token',
        expires_at: '2024-01-08T00:00:00.000Z'
      }
      mockSupabase.rpc.mockResolvedValue({ data: [mockInvite], error: null })

      const result = await ShoppingListService.generateShareLink(mockListId, mockUserId)

      expect(result.token).toBe('abc123token')
      expect(result.url).toContain('/join/abc123token')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_list_invite', {
        p_list_id: mockListId,
        p_user_id: mockUserId
      })
    })

    it('should throw error if RPC fails', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC error') })

      await expect(ShoppingListService.generateShareLink(mockListId, mockUserId)).rejects.toThrow()
    })
  })

  describe('revokeShareLink', () => {
    it('should revoke all invites via RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 3, error: null })

      const result = await ShoppingListService.revokeShareLink(mockListId)

      expect(result).toBe(3)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('revoke_list_invites', { p_list_id: mockListId })
    })
  })

  describe('getActiveShareLink', () => {
    it('should return active share link if exists', async () => {
      const mockInvite = {
        token: 'active-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: '2024-01-01T00:00:00.000Z'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: mockInvite, error: null })
                  })
                })
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getActiveShareLink(mockListId)

      expect(result.token).toBe('active-token')
      expect(result.url).toContain('/join/active-token')
    })

    it('should return null if no active invite', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getActiveShareLink(mockListId)

      expect(result).toBeNull()
    })
  })

  describe('joinListViaInvite', () => {
    it('should join list via invite token', async () => {
      const mockResult = {
        list_id: mockListId,
        list_name: 'Shared List',
        joined_at: '2024-01-01T00:00:00.000Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockResult], error: null })

      // Mock setActiveList call
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockMembership, error: null })
              })
            })
          })
        })

      const result = await ShoppingListService.joinListViaInvite('valid-token', mockUserId)

      expect(result.listId).toBe(mockListId)
      expect(result.listName).toBe('Shared List')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('join_list_via_invite', {
        p_token: 'valid-token',
        p_user_id: mockUserId
      })
    })
  })

  describe('leaveList', () => {
    it('should leave list via RPC', async () => {
      const mockResult = {
        was_last_member: false,
        list_deleted: false
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockResult], error: null })

      // Mock getUserShoppingLists for reactivation check
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ ...mockMembership, is_active: true }],
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.leaveList(mockListId, mockUserId)

      expect(result.wasLastMember).toBe(false)
      expect(result.listDeleted).toBe(false)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('leave_list', {
        p_list_id: mockListId,
        p_user_id: mockUserId
      })
    })
  })

  describe('getListMembers', () => {
    it('should get list members via RPC', async () => {
      const mockMembers = [
        { user_id: mockUserId, email: 'user@test.com', joined_at: '2024-01-01' }
      ]
      mockSupabase.rpc.mockResolvedValue({ data: mockMembers, error: null })

      const result = await ShoppingListService.getListMembers(mockListId, mockUserId)

      expect(result).toEqual(mockMembers)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_list_members', { p_list_id: mockListId, p_user_id: mockUserId })
    })
  })

  describe('isListShared', () => {
    it('should return true if more than one member', async () => {
      const mockMembers = [
        { user_id: 'user-1' },
        { user_id: 'user-2' }
      ]
      mockSupabase.rpc.mockResolvedValue({ data: mockMembers, error: null })

      const result = await ShoppingListService.isListShared(mockListId, mockUserId)

      expect(result).toBe(true)
    })

    it('should return false if only one member', async () => {
      const mockMembers = [{ user_id: 'user-1' }]
      mockSupabase.rpc.mockResolvedValue({ data: mockMembers, error: null })

      const result = await ShoppingListService.isListShared(mockListId, mockUserId)

      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // REFRESH METHOD
  // ============================================================================

  describe('refreshList', () => {
    it('should return complete list data', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockShoppingList, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [mockShoppingItem], error: null })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [mockAisle], error: null })
            })
          })
        })

      mockSupabase.rpc.mockResolvedValue({ data: [{ user_id: mockUserId }], error: null })

      const result = await ShoppingListService.refreshList(mockListId, mockUserId)

      expect(result.list).toEqual(mockShoppingList)
      expect(result.items).toHaveLength(1)
      expect(result.aisles).toHaveLength(1)
      expect(result.members).toHaveLength(1)
    })
  })

  // ============================================================================
  // LEGACY METHODS
  // ============================================================================

  describe('deleteShoppingList (legacy)', () => {
    it('should redirect to leaveList', async () => {
      const mockResult = { was_last_member: true, list_deleted: true }
      mockSupabase.rpc.mockResolvedValue({ data: [mockResult], error: null })

      // Mock getUserShoppingLists (called after leave_list to check for remaining lists)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })

      await ShoppingListService.deleteShoppingList(mockUserId, mockListId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('leave_list', {
        p_list_id: mockListId,
        p_user_id: mockUserId
      })
    })
  })

  // ============================================================================
  // SUPERMARKET METHODS
  // ============================================================================

  describe('getListSupermarkets', () => {
    const mockSupermarkets = [
      { id: 'super-1', name: 'Mercadona', color: '#00a65a', display_order: 1 },
      { id: 'super-2', name: 'Carrefour', color: '#0066cc', display_order: 2 }
    ]

    it('should return supermarkets for a list', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockSupermarkets,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getListSupermarkets(mockListId)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Mercadona')
      expect(mockSupabase.from).toHaveBeenCalledWith('list_supermarkets')
    })

    it('should return empty array if no supermarkets', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getListSupermarkets(mockListId)

      expect(result).toEqual([])
    })

    it('should use default color if not provided', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ id: 'super-1', name: 'Test', color: null, display_order: 1 }],
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getListSupermarkets(mockListId)

      expect(result[0].color).toBe('#6b7280')
    })
  })
})
