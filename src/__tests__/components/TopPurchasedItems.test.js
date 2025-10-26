import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopPurchasedItems from '../../components/TopPurchasedItems'
import { useTranslations } from '../../contexts/LanguageContext'
import { mapEnglishToLocalized } from '../../types/shoppingList'

jest.mock('../../contexts/LanguageContext')
jest.mock('../../types/shoppingList', () => {
  const actual = jest.requireActual('../../types/shoppingList')
  return {
    ...actual,
    mapEnglishToLocalized: jest.fn()
  }
})

const mockUseTranslations = useTranslations
const mockMapEnglishToLocalized = mapEnglishToLocalized

const translationMap = {
  'topItems.title': 'History',
  'topItems.subtitle': 'Quickly add your previously purchased products',
  'topItems.refreshing': 'Updating...',
  'topItems.empty': 'Your purchase history will appear here as you add items.',
  'topItems.alreadyAdded': 'Already added',
  'topItems.addButton': 'Add to list',
  'topItems.menuButton': 'Item actions',
  'topItems.deleteFromHistory': 'Remove from history',
  'topItems.deleteConfirm': 'Are you sure you want to remove "{{itemName}}" from your purchase history?',
  'common.close': 'Close'
}

describe('TopPurchasedItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseTranslations.mockReturnValue((key, options) => {
      if (key === 'topItems.purchasedCount') {
        return `Purchased ${options?.count ?? 0} times`
      }
      if (key === 'topItems.deleteConfirm') {
        return `Are you sure you want to remove "${options?.itemName}" from your purchase history?`
      }
      return translationMap[key] || key
    })

    mockMapEnglishToLocalized.mockImplementation((aisles) =>
      aisles.map((aisle) => `Localized ${aisle}`)
    )
  })

  const baseItem = {
    item_name: 'Milk',
    purchase_count: 5,
    last_aisle: 'Dairy'
  }

  it('renders header with translated title and subtitle', () => {
    render(<TopPurchasedItems items={[]} loading={false} onAddItem={jest.fn()} />)

    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Quickly add your previously purchased products')).toBeInTheDocument()
  })

  it('shows full-screen spinner when loading with no items', () => {
    const { container } = render(<TopPurchasedItems loading items={[]} />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Your purchase history will appear here as you add items.')).not.toBeInTheDocument()
  })

  it('renders empty state when there are no items and not loading', () => {
    render(<TopPurchasedItems items={[]} loading={false} />)

    expect(screen.getByText('Your purchase history will appear here as you add items.')).toBeInTheDocument()
  })

  it('renders add buttons for items not in the current list and triggers callback', async () => {
    const onAddItem = jest.fn()
    const user = userEvent.setup()

    render(
      <TopPurchasedItems
        items={[baseItem]}
        loading={false}
        onAddItem={onAddItem}
        existingItemNames={[]}
        aisleColors={{ 'Localized Dairy': '#123456' }}
      />
    )

    expect(mockMapEnglishToLocalized).toHaveBeenCalledWith(['Dairy'], expect.any(Function))
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Purchased 5 times')).toBeInTheDocument()

    const badge = screen.getByText('Localized Dairy')
    expect(badge.style.backgroundColor).toBe('rgb(18, 52, 86)')

    const addButton = screen.getByRole('button', { name: /Add to list/ })
    await user.click(addButton)

    expect(onAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item_name: 'Milk',
        displayAisle: 'Localized Dairy',
        isInCurrentList: false
      })
    )
  })

  it('shows already-added state for items that exist in the current list', () => {
    render(
      <TopPurchasedItems
        items={[baseItem]}
        loading={false}
        existingItemNames={['  milk  ']}
        aisleColors={{ 'Localized Dairy': '#123456' }}
      />
    )

    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Already added')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add to list/ })).not.toBeInTheDocument()
  })

  it('falls back to the first custom aisle when last aisle is missing', () => {
    const itemWithoutAisle = {
      item_name: 'Bananas',
      purchase_count: 2,
      last_aisle: null
    }

    render(
      <TopPurchasedItems
        items={[itemWithoutAisle]}
        loading={false}
        customAisles={['Produce', 'Bakery']}
        aisleColors={{ Produce: '#abcdef' }}
      />
    )

    expect(screen.getByText('Bananas')).toBeInTheDocument()
    expect(screen.getByText('Purchased 2 times')).toBeInTheDocument()
    expect(screen.getByText('Produce')).toBeInTheDocument()
    expect(mockMapEnglishToLocalized).not.toHaveBeenCalled()
  })

  it('shows inline refreshing indicator when loading with existing items', () => {
    render(
      <TopPurchasedItems
        items={[baseItem]}
        loading
        existingItemNames={[]}
        aisleColors={{ 'Localized Dairy': '#123456' }}
      />
    )

    expect(screen.getByText('Updating...')).toBeInTheDocument()
  })

  it('renders close button when onClose is provided and triggers it', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()

    render(
      <TopPurchasedItems
        items={[baseItem]}
        loading={false}
        onClose={onClose}
        existingItemNames={[]}
        aisleColors={{ 'Localized Dairy': '#123456' }}
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('Kebab menu', () => {
    it('renders kebab menu button for each item', () => {
      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      const menuButtons = screen.getAllByLabelText('Item actions')
      expect(menuButtons).toHaveLength(1)
    })

    it('opens menu when kebab button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Menu should not be visible initially
      expect(screen.queryByText('Remove from history')).not.toBeInTheDocument()

      // Click kebab menu button
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      // Menu should now be visible
      expect(screen.getByText('Remove from history')).toBeInTheDocument()
    })

    it('closes menu when backdrop is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      expect(screen.getByText('Remove from history')).toBeInTheDocument()

      // Click backdrop (the fixed overlay)
      const backdrop = screen.getByText('Remove from history').parentElement.previousSibling
      await user.click(backdrop)

      // Menu should be closed
      expect(screen.queryByText('Remove from history')).not.toBeInTheDocument()
    })

    it('shows "Add to list" option in menu when item is not in current list', async () => {
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      // Both options should be visible
      const addButtons = screen.getAllByText('Add to list')
      expect(addButtons.length).toBeGreaterThan(0)
      expect(screen.getByText('Remove from history')).toBeInTheDocument()
    })

    it('does not show "Add to list" option in menu when item is already in list', async () => {
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          existingItemNames={['milk']}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      // Should only show "Remove from history" option (not "Add to list")
      expect(screen.queryByRole('button', { name: /Add to list/i })).not.toBeInTheDocument()
      expect(screen.getByText('Remove from history')).toBeInTheDocument()
    })

    it('triggers onDeleteItem when delete option is clicked', async () => {
      const onDeleteItem = jest.fn()
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          onDeleteItem={onDeleteItem}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      // Click delete option
      const deleteButton = screen.getByText('Remove from history')
      await user.click(deleteButton)

      expect(onDeleteItem).toHaveBeenCalledWith('Milk')
      expect(onDeleteItem).toHaveBeenCalledTimes(1)
    })

    it('triggers onAddItem when "Add to list" in menu is clicked', async () => {
      const onAddItem = jest.fn()
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          onAddItem={onAddItem}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)

      // Click "Add to list" in menu
      const menuAddButton = screen.getAllByText('Add to list')[1] // Second one is in the menu
      await user.click(menuAddButton)

      expect(onAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          item_name: 'Milk',
          displayAisle: 'Localized Dairy'
        })
      )
    })

    it('closes menu after clicking delete option', async () => {
      const onDeleteItem = jest.fn()
      const user = userEvent.setup()

      render(
        <TopPurchasedItems
          items={[baseItem]}
          loading={false}
          onDeleteItem={onDeleteItem}
          existingItemNames={[]}
          aisleColors={{ 'Localized Dairy': '#123456' }}
        />
      )

      // Open menu
      const menuButton = screen.getByLabelText('Item actions')
      await user.click(menuButton)
      expect(screen.getByText('Remove from history')).toBeInTheDocument()

      // Click delete
      const deleteButton = screen.getByText('Remove from history')
      await user.click(deleteButton)

      // Menu should be closed
      expect(screen.queryByText('Remove from history')).not.toBeInTheDocument()
    })
  })
})
