import { ShoppingListService } from '../../lib/shoppingListService'
import { supabase } from '../../lib/supabase'

// Mock external dependencies
jest.mock('../../lib/supabase')

const mockSupabase = supabase

describe('ShoppingListService', () => {
  const mockUserId = 'user-123'
  const mockListId = 'list-123'
  const mockItemId = 'item-123'

  const mockShoppingList = {
    id: mockListId,
    user_id: mockUserId,
    name: 'My Shopping List',
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  const mockShoppingItem = {
    id: mockItemId,
    shopping_list_id: mockListId,
    user_id: mockUserId,
    name: 'Apples',
    aisle: 'Produce',
    quantity: 3,
    comment: '',
    completed: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Create a simple mock that can be chained without recursion
    const createBasicMock = () => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: null, error: null })
    })
    
    // Set up basic mock for supabase operations - each test will override as needed
    mockSupabase.from = jest.fn().mockReturnValue(createBasicMock())
    mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getUserShoppingLists', () => {
    it('should return user shopping lists', async () => {
      const mockLists = [mockShoppingList]
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockLists,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getUserShoppingLists(mockUserId)

      expect(result).toEqual(mockLists)
      expect(mockSupabase.from).toHaveBeenCalledWith('shopping_lists')
    })

    it('should return empty array when no lists found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getUserShoppingLists(mockUserId)

      expect(result).toEqual([])
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.getUserShoppingLists(mockUserId)).rejects.toThrow('Database error')
    })
  })

  describe('getActiveShoppingList', () => {
    it('should return active shopping list', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockShoppingList,
                error: null
              })
            })
          })
        })
      })

      const result = await ShoppingListService.getActiveShoppingList(mockUserId)

      expect(result).toEqual(mockShoppingList)
    })

    it('should create default list if no active list exists', async () => {
      const error = { code: 'PGRST116' }
      const newList = { ...mockShoppingList, name: 'My Shopping List' }
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newList,
                error: null
              })
            })
          })
        })

      const result = await ShoppingListService.getActiveShoppingList(mockUserId)

      expect(result).toEqual(newList)
    })

    it('should handle other database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error
              })
            })
          })
        })
      })

      await expect(ShoppingListService.getActiveShoppingList(mockUserId)).rejects.toThrow('Database error')
    })
  })

  describe('createShoppingList', () => {
    it('should create a new shopping list', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockShoppingList,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.createShoppingList(mockUserId, 'New List')

      expect(result).toEqual(mockShoppingList)
    })

    it('should deactivate other lists when setting as active', async () => {
      // Mock the deactivate chain properly
      const deactivateChain = {
        eq: jest.fn().mockResolvedValue({ error: null })
      }
      
      // Mock the insert chain properly
      const insertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockShoppingList,
            error: null
          })
        })
      }
      
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(deactivateChain)
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(insertChain)
        })

      const result = await ShoppingListService.createShoppingList(mockUserId, 'New List', true)

      expect(result).toEqual(mockShoppingList)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.createShoppingList(mockUserId, 'New List')).rejects.toThrow('Database error')
    })
  })

  describe('setActiveList', () => {
    it('should set a list as active', async () => {
      // Mock the deactivate chain properly
      const deactivateChain = {
        eq: jest.fn().mockResolvedValue({ error: null })
      }
      
      // Mock the activate chain properly
      const activateChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockShoppingList,
                error: null
              })
            })
          })
        })
      }
      
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(deactivateChain)
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(activateChain)
        })

      const result = await ShoppingListService.setActiveList(mockUserId, mockListId)

      expect(result).toEqual(mockShoppingList)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      
      // Mock the deactivate chain (success)
      const deactivateChain = {
        eq: jest.fn().mockResolvedValue({ error: null })
      }
      
      // Mock the activate chain (error)
      const activateChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error
              })
            })
          })
        })
      }
      
      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(deactivateChain)
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(activateChain)
        })

      await expect(ShoppingListService.setActiveList(mockUserId, mockListId)).rejects.toThrow('Database error')
    })
  })

  describe('deleteShoppingList', () => {
    it.skip('should delete a shopping list', async () => {
      const allLists = [mockShoppingList, { ...mockShoppingList, id: 'list-2', is_active: false }]
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: allLists,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          })
        })

      const result = await ShoppingListService.deleteShoppingList(mockUserId, mockListId)

      expect(result).toBe(true)
    })

    it('should throw error when trying to delete the last list', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockShoppingList],
              error: null
            })
          })
        })
      })

      await expect(ShoppingListService.deleteShoppingList(mockUserId, mockListId))
        .rejects.toThrow('Cannot delete the last remaining list')
    })

    it('should set another list as active when deleting active list', async () => {
      const list2 = { ...mockShoppingList, id: 'list-2', is_active: false }
      const allLists = [mockShoppingList, list2]
      
      const mockSetActive = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ error: null })
        })
      })
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: allLists,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: list2,
                    error: null
                  })
                })
              })
            })
          })
        })

      await ShoppingListService.deleteShoppingList(mockUserId, mockListId)
    })
  })

  describe('getShoppingItems', () => {
    it('should return shopping items for a list', async () => {
      const mockItems = [mockShoppingItem]
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockItems,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getShoppingItems(mockListId)

      expect(result).toEqual(mockItems)
    })

    it('should return empty array when no items found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.getShoppingItems(mockListId)

      expect(result).toEqual([])
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.getShoppingItems(mockListId)).rejects.toThrow('Database error')
    })
  })

  describe('addShoppingItem', () => {
    it('should add a new shopping item', async () => {
      const itemData = {
        name: 'Apples',
        aisle: 'Produce',
        quantity: 3,
        comment: 'Red apples'
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockShoppingItem,
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.addShoppingItem(mockListId, mockUserId, itemData)

      expect(result).toEqual(mockShoppingItem)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      const itemData = { name: 'Apples', aisle: 'Produce', quantity: 3 }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.addShoppingItem(mockListId, mockUserId, itemData))
        .rejects.toThrow('Database error')
    })
  })

  describe('updateShoppingItem', () => {
    it('should update a shopping item', async () => {
      const updates = { name: 'Green Apples', quantity: 5 }
      const updatedItem = { ...mockShoppingItem, ...updates }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedItem,
                error: null
              })
            })
          })
        })
      })

      const result = await ShoppingListService.updateShoppingItem(mockItemId, updates)

      expect(result).toEqual(updatedItem)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      const updates = { name: 'Green Apples' }

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error
              })
            })
          })
        })
      })

      await expect(ShoppingListService.updateShoppingItem(mockItemId, updates))
        .rejects.toThrow('Database error')
    })
  })

  describe('deleteShoppingItem', () => {
    it('should delete a shopping item', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await ShoppingListService.deleteShoppingItem(mockItemId)

      expect(result).toBe(true)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error })
        })
      })

      await expect(ShoppingListService.deleteShoppingItem(mockItemId)).rejects.toThrow('Database error')
    })
  })

  describe('clearCompletedItems', () => {
    it('should clear completed items', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      })

      const result = await ShoppingListService.clearCompletedItems(mockListId)

      expect(result).toBe(true)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error })
          })
        })
      })

      await expect(ShoppingListService.clearCompletedItems(mockListId)).rejects.toThrow('Database error')
    })
  })

  describe('clearAllItems', () => {
    it('should clear all items', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await ShoppingListService.clearAllItems(mockListId)

      expect(result).toBe(true)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error })
        })
      })

      await expect(ShoppingListService.clearAllItems(mockListId)).rejects.toThrow('Database error')
    })
  })

  describe('getUserAisles', () => {
    it('should return user aisles', async () => {
      const mockAisles = [
        { id: '1', user_id: mockUserId, name: 'Produce', display_order: 1 },
        { id: '2', user_id: mockUserId, name: 'Dairy', display_order: 2 }
      ]

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

      const result = await ShoppingListService.getUserAisles(mockUserId)

      expect(result).toEqual(['Produce', 'Dairy'])
    })

    it('should create default aisles if user has none', async () => {
      const mockDefaultAisles = [
        { id: '1', user_id: mockUserId, name: 'Produce', display_order: 1 }
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      
      mockSupabase.rpc.mockResolvedValue({ error: null })
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockDefaultAisles,
                error: null
              })
            })
          })
        })

      const result = await ShoppingListService.getUserAisles(mockUserId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_default_user_aisles', {
        p_user_id: mockUserId
      })
      expect(result).toEqual(['Produce'])
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.getUserAisles(mockUserId)).rejects.toThrow('Database error')
    })
  })

  describe('updateUserAisles', () => {
    it('should update user aisles', async () => {
      const newAisles = ['Produce', 'Dairy', 'Bakery']
      const mockUpdatedAisles = newAisles.map((name, index) => ({
        id: `${index + 1}`,
        user_id: mockUserId,
        name,
        display_order: index + 1
      }))

      mockSupabase.from
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: mockUpdatedAisles,
              error: null
            })
          })
        })

      const result = await ShoppingListService.updateUserAisles(mockUserId, newAisles)

      expect(result).toEqual(newAisles)
    })

    it('should handle database errors during deletion', async () => {
      const error = new Error('Delete error')
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error })
        })
      })

      await expect(ShoppingListService.updateUserAisles(mockUserId, ['Produce']))
        .rejects.toThrow('Delete error')
    })

    it('should handle database errors during insertion', async () => {
      const error = new Error('Insert error')
      mockSupabase.from
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })

      await expect(ShoppingListService.updateUserAisles(mockUserId, ['Produce']))
        .rejects.toThrow('Insert error')
    })
  })

  describe('migrateLocalStorageAisles', () => {
    it('should migrate aisles when user has none in database', async () => {
      const localAisles = ['Produce', 'Dairy']
      
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: localAisles.map((name, index) => ({ name, display_order: index + 1 })),
              error: null
            })
          })
        })

      const result = await ShoppingListService.migrateLocalStorageAisles(mockUserId, localAisles)

      expect(result).toBe(true)
    })

    it('should not migrate when user already has aisles', async () => {
      const localAisles = ['Produce', 'Dairy']
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [{ id: '1' }],
              error: null
            })
          })
        })
      })

      const result = await ShoppingListService.migrateLocalStorageAisles(mockUserId, localAisles)

      expect(result).toBe(false)
    })

    it.skip('should handle database errors', async () => {
      const error = new Error('Database error')
      // Mock the select query for checking existing aisles to return error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error
            })
          })
        })
      })

      await expect(ShoppingListService.migrateLocalStorageAisles(mockUserId, ['Produce']))
        .rejects.toThrow('Database error')
    })
  })
})
