import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopPurchasedItems from '../../components/TopPurchasedItems'
import { useTranslations } from '../../contexts/LanguageContext'
import { mapEnglishToLocalized } from '../../types/shoppingList'

jest.mock('../../contexts/LanguageContext')
jest.mock('../../types/shoppingList', () => ({
  mapEnglishToLocalized: jest.fn()
}))

const mockUseTranslations = useTranslations
const mockMapEnglishToLocalized = mapEnglishToLocalized

const translationMap = {
  'topItems.title': 'Top Purchased Items',
  'topItems.subtitle': 'Items you add often',
  'topItems.refreshing': 'Refreshing top items…',
  'topItems.empty': 'No top items yet',
  'topItems.alreadyAdded': 'Already added',
  'topItems.addButton': 'Add to list',
  'common.close': 'Close'
}

describe('TopPurchasedItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseTranslations.mockReturnValue((key, options) => {
      if (key === 'topItems.purchasedCount') {
        return `Purchased ${options?.count ?? 0} times`
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

    expect(screen.getByText('Top Purchased Items')).toBeInTheDocument()
    expect(screen.getByText('Items you add often')).toBeInTheDocument()
  })

  it('shows full-screen spinner when loading with no items', () => {
    const { container } = render(<TopPurchasedItems loading items={[]} />)

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('No top items yet')).not.toBeInTheDocument()
  })

  it('renders empty state when there are no items and not loading', () => {
    render(<TopPurchasedItems items={[]} loading={false} />)

    expect(screen.getByText('No top items yet')).toBeInTheDocument()
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
      />
    )

    expect(mockMapEnglishToLocalized).toHaveBeenCalledWith(['Dairy'], expect.any(Function))
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('Purchased 5 times • Localized Dairy')).toBeInTheDocument()

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
      />
    )

    expect(screen.getByText('Bananas')).toBeInTheDocument()
    expect(screen.getByText('Purchased 2 times • Produce')).toBeInTheDocument()
    expect(mockMapEnglishToLocalized).not.toHaveBeenCalled()
  })

  it('shows inline refreshing indicator when loading with existing items', () => {
    render(
      <TopPurchasedItems
        items={[baseItem]}
        loading
        existingItemNames={[]}
      />
    )

    expect(screen.getByText('Refreshing top items…')).toBeInTheDocument()
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
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
