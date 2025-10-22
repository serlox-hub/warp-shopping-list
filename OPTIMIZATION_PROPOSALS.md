# Request Optimization Proposals

**Date:** 2025-10-21
**Status:** Pending Implementation

## Executive Summary

After analyzing the application's request patterns, I've identified 5 optimization strategies that could reduce total requests by 50-70% and improve perceived performance significantly.

---

## Current State Analysis

The application makes **14 database calls** across different operations:

### On Initial Load (4-5 requests)
- `getUserAisles()` - Fetch user's custom aisles
- `getActiveShoppingList()` - Fetch active list
- `getShoppingItems()` - Fetch items (depends on list ID)
- `getMostPurchasedItems()` - Fetch top items
- `getItemUsageHistory()` - Fetch usage stats

### On User Actions (1-2 requests each)
- Add/update/delete items
- Mark complete/incomplete
- Clear operations
- Aisle updates

### Key Issues Identified
1. **Sequential waterfall:** `getActiveShoppingList()` → `getShoppingItems()` blocks parallel execution
2. **Over-fetching on mount:** Load data that users might not use immediately (top items, usage history)
3. **No caching:** Every action refetches all data
4. **Synchronous UI updates:** Users wait for server confirmation
5. **No real-time sync:** Multi-user scenarios require manual refresh

---

## Optimization Proposals

### 1. Batch Initial Load Requests ⭐ **RECOMMENDED FIRST STEP**

**Current Code (src/app/page.js:103-106):**
```javascript
// 2 sequential requests - waterfall pattern
const list = await ShoppingListService.getActiveShoppingList(userId);
const listItems = await ShoppingListService.getShoppingItems(list.id);
```

**Proposed Solution:**
```javascript
// 1 request with SQL join
const { list, items } = await ShoppingListService.getActiveShoppingListWithItems(userId);
```

**Implementation Steps:**
1. Add new method to `ShoppingListService`:
   ```javascript
   async getActiveShoppingListWithItems(userId) {
     const { data, error } = await supabase
       .from('shopping_lists')
       .select(`
         *,
         shopping_items (*)
       `)
       .eq('user_id', userId)
       .eq('is_active', true)
       .single();

     if (error) throw error;
     return {
       list: {
         id: data.id,
         name: data.name,
         user_id: data.user_id,
         is_active: data.is_active,
         created_at: data.created_at,
         updated_at: data.updated_at
       },
       items: data.shopping_items || []
     };
   }
   ```

2. Update `loadShoppingListData()` in page.js
3. Add tests for new service method

**Impact:**
- ✅ Reduces initial load from 5 to 4 requests
- ✅ Eliminates sequential waterfall (~200-300ms saved)
- ✅ No new dependencies
- ✅ ~30-50% faster initial load

**Tradeoffs:**
- ⚠️ Requires new service method
- ⚠️ Slightly more complex query

**Estimated effort:** 1-2 hours

---

### 2. Implement Request Caching with React Query 🚀 **HIGH IMPACT**

**Problem:** Every operation refetches all data, even unchanged data.

**Solution:** Add `@tanstack/react-query` for automatic caching and smart refetching.

**Implementation Overview:**
```bash
npm install @tanstack/react-query
```

```javascript
// src/app/layout.js - Add QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* existing providers */}
    </QueryClientProvider>
  );
}
```

```javascript
// src/app/page.js - Use queries instead of manual state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data: aisles, isLoading: aislesLoading } = useQuery({
  queryKey: ['aisles', userId],
  queryFn: () => ShoppingListService.getUserAisles(userId),
  enabled: !!userId,
});

const { data: listData, isLoading: listLoading } = useQuery({
  queryKey: ['shopping-list', userId],
  queryFn: () => ShoppingListService.getActiveShoppingListWithItems(userId),
  enabled: !!userId,
});

const addItemMutation = useMutation({
  mutationFn: (newItem) => ShoppingListService.addShoppingItem(newItem),
  onSuccess: () => {
    queryClient.invalidateQueries(['shopping-list', userId]);
  },
});
```

**Impact:**
- ✅ Automatic deduplication (multiple components requesting same data = 1 request)
- ✅ Background refetching keeps data fresh
- ✅ Built-in loading and error states
- ✅ Can reduce requests by 40-60% in typical usage
- ✅ Foundation for optimistic updates

**Tradeoffs:**
- ⚠️ New dependency (~13KB gzipped)
- ⚠️ Learning curve for the pattern
- ⚠️ Requires refactoring data loading logic throughout page.js
- ⚠️ Need to update tests to work with React Query

**Estimated effort:** 4-6 hours

---

### 3. Optimistic UI Updates 🎯 **BETTER UX**

**Problem:** Users wait for server confirmation before seeing changes (200-500ms delay).

**Current Flow:**
1. User clicks "complete item"
2. UI shows loading spinner
3. Request to server (200-500ms)
4. Server responds
5. UI updates

**Optimized Flow:**
1. User clicks "complete item"
2. **UI updates immediately**
3. Request to server in background
4. Rollback if error occurs

**Implementation Example:**
```javascript
const toggleItemCompletion = async (itemId, currentState) => {
  // 1. Optimistically update UI
  setShoppingItems(prev =>
    prev.map(item =>
      item.id === itemId
        ? { ...item, completed: !currentState }
        : item
    )
  );

  try {
    // 2. Update server in background
    await ShoppingListService.updateShoppingItem(itemId, {
      completed: !currentState
    });
  } catch (error) {
    // 3. Rollback on error
    setShoppingItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, completed: currentState }
          : item
      )
    );
    console.error('Failed to update item:', error);
    // Show error toast to user
  }
};
```

**Works even better with React Query:**
```javascript
const toggleItemMutation = useMutation({
  mutationFn: ({ itemId, completed }) =>
    ShoppingListService.updateShoppingItem(itemId, { completed }),
  onMutate: async ({ itemId, completed }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['shopping-list', userId]);

    // Snapshot previous value
    const previousData = queryClient.getQueryData(['shopping-list', userId]);

    // Optimistically update
    queryClient.setQueryData(['shopping-list', userId], old => ({
      ...old,
      items: old.items.map(item =>
        item.id === itemId ? { ...item, completed } : item
      )
    }));

    return { previousData };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['shopping-list', userId], context.previousData);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['shopping-list', userId]);
  },
});
```

**Impact:**
- ✅ Feels instant to users
- ✅ Works well with poor connections
- ✅ Significantly improves perceived performance
- ✅ Better user experience overall

**Tradeoffs:**
- ⚠️ More complex error handling
- ⚠️ Possible UI flicker on errors (rare)
- ⚠️ Need to handle race conditions carefully

**Estimated effort:** 3-4 hours (easier with React Query)

---

### 4. Supabase Real-time Subscriptions 📡 **FOR COLLABORATION**

**Problem:** Multiple users don't see each other's changes without manual refresh.

**Current Limitation:** If two users share a list (future feature), they don't see real-time updates.

**Solution:** Subscribe to table changes instead of polling.

**Implementation:**
```javascript
// src/app/page.js
useEffect(() => {
  if (!activeList?.id) return;

  // Subscribe to shopping_items changes
  const subscription = supabase
    .channel(`shopping_items:${activeList.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_items',
        filter: `shopping_list_id=eq.${activeList.id}`,
      },
      (payload) => {
        console.log('Change received!', payload);

        if (payload.eventType === 'INSERT') {
          setShoppingItems(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setShoppingItems(prev =>
            prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setShoppingItems(prev =>
            prev.filter(item => item.id !== payload.old.id)
          );
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [activeList?.id]);
```

**Impact:**
- ✅ Automatic multi-user sync
- ✅ Eliminates manual refresh needs
- ✅ More scalable for collaborative use
- ✅ Real-time updates feel modern and responsive

**Tradeoffs:**
- ⚠️ Requires Supabase real-time enabled (already supported by Supabase)
- ⚠️ Adds complexity to state management
- ⚠️ Need to handle own updates vs. others' updates
- ⚠️ Not useful for single-user scenarios
- ⚠️ Additional Supabase costs if usage is high

**Estimated effort:** 2-3 hours

**Note:** This is lower priority unless multi-user collaboration is a near-term goal.

---

### 5. Lazy Load Non-Critical Data ⏱️ **FASTER INITIAL LOAD**

**Problem:** We load everything on mount, even data users might not use.

**Current Load Sequence (src/app/page.js:143-148):**
```javascript
useEffect(() => {
  if (userId) {
    Promise.all([
      loadUserAisles(),           // CRITICAL - needed immediately
      loadShoppingListData(),     // CRITICAL - needed immediately
      loadTopItems(),             // NON-CRITICAL - only used in modal
      loadItemUsageHistory()      // NON-CRITICAL - only for suggestions
    ]);
  }
}, [userId]);
```

**Proposed Optimization:**
```javascript
// Load critical data immediately
useEffect(() => {
  if (userId) {
    Promise.all([
      loadUserAisles(),
      loadShoppingListData(),
    ]);
  }
}, [userId]);

// Lazy load top items when modal opens
const handleOpenTopItems = async () => {
  if (!topItems.length) {
    await loadTopItems();
  }
  setIsTopItemsOpen(true);
};

// Lazy load usage history when needed
useEffect(() => {
  if (userId && shoppingItems.length > 0 && !itemUsageHistory.length) {
    loadItemUsageHistory();
  }
}, [userId, shoppingItems.length]);
```

**Impact:**
- ✅ Initial load: 5 requests → 3 requests (40% reduction)
- ✅ Faster perceived load time
- ✅ Less data transferred upfront
- ✅ Better performance on slow connections

**Tradeoffs:**
- ⚠️ Slight delay when opening Top Items modal for first time (~200-500ms)
- ⚠️ Need to show loading state in modal

**Estimated effort:** 1-2 hours

---

## Recommended Implementation Order

Based on **impact vs effort ratio:**

### Phase 1: Quick Wins (2-4 hours total)
1. **Batch Initial Load** (1-2h, medium impact)
   - Quick win, no new dependencies
   - Immediate measurable improvement

2. **Lazy Load Non-Critical** (1-2h, medium impact)
   - Another quick win
   - Reduces initial load by 40%

**Expected result after Phase 1:** ~40% faster initial load, better perceived performance

### Phase 2: Major Improvements (3-4 hours)
3. **Optimistic UI Updates** (3-4h, high UX impact)
   - Makes app feel significantly faster
   - Can be done without React Query (though easier with it)

**Expected result after Phase 2:** App feels instant to users

### Phase 3: Long-term Foundation (4-6 hours)
4. **React Query** (4-6h, highest long-term impact)
   - Best long-term solution for scalability
   - Enables better patterns for future features
   - Combines well with optimistic updates

**Expected result after Phase 3:** 50-70% reduction in total requests during typical usage

### Phase 4: Optional Enhancement (2-3 hours)
5. **Real-time Subscriptions** (2-3h, conditional)
   - Only if multi-user collaboration is priority
   - Can be added later without affecting other optimizations

---

## My Recommendation

**Start with Phase 1 (Batch + Lazy Load):**
- ✅ Low risk, high reward
- ✅ No new dependencies
- ✅ Can be done in 2-4 hours
- ✅ Provide immediate measurable improvement (~40% faster initial load)
- ✅ Good foundation for further optimizations

Then evaluate Phase 2 and 3 based on user feedback and priorities.

---

## Implementation Checklist

When you're ready to proceed, I will:

- [ ] Implement batched initial load
  - [ ] Add `getActiveShoppingListWithItems()` to ShoppingListService
  - [ ] Update `loadShoppingListData()` in page.js
  - [ ] Add tests for new service method
  - [ ] Verify performance improvement

- [ ] Implement lazy loading
  - [ ] Move `loadTopItems()` to modal open handler
  - [ ] Add conditional loading for `loadItemUsageHistory()`
  - [ ] Add loading states where needed
  - [ ] Update tests

- [ ] Run full test suite and build
  - [ ] `npm test` - Verify all tests pass
  - [ ] `npm run build` - Verify production build works
  - [ ] Manual testing of affected flows

- [ ] Measure improvement
  - [ ] Document before/after request counts
  - [ ] Document before/after load times

---

## Next Steps

**Tomorrow, tell me:**
- "Implement Phase 1 optimizations" (for quick wins), OR
- "Implement all optimization proposals" (for complete overhaul), OR
- "Implement only [specific optimization]" (for targeted improvement)

And I'll proceed with the implementation following the TDD workflow.
