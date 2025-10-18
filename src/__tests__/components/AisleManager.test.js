import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AisleManager from '../../components/AisleManager'

jest.mock('../../contexts/LanguageContext', () => ({
  useTranslations: () => (key) => key
}))

jest.mock('../../types/shoppingList', () => {
  const actual = jest.requireActual('../../types/shoppingList')
  return {
    ...actual,
    isValidAisleName: jest.fn().mockReturnValue(true)
  }
})

const { isValidAisleName: mockIsValidAisleName } = require('../../types/shoppingList')

describe('AisleManager', () => {
  const onUpdateAisles = jest.fn()
  const onClose = jest.fn()

  const baseAisles = [
    { name: 'Produce', color: '#22c55e' },
    { name: 'Dairy', color: '#f97316' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsValidAisleName.mockReturnValue(true)
  })

  it('renders existing aisles with color pickers', () => {
    render(<AisleManager aisles={baseAisles} onUpdateAisles={onUpdateAisles} onClose={onClose} />)

    expect(screen.getByText('Produce')).toBeInTheDocument()
    expect(screen.getByText('Dairy')).toBeInTheDocument()
    expect(screen.getAllByLabelText('aisleManager.colorLabel')).toHaveLength(2)
  })

  it('allows renaming and recoloring an aisle before saving', async () => {
    const user = userEvent.setup()

    render(<AisleManager aisles={baseAisles} onUpdateAisles={onUpdateAisles} onClose={onClose} />)

    await user.click(screen.getAllByTitle('common.edit')[0])

    const nameInput = screen.getByDisplayValue('Produce')
    await user.clear(nameInput)
    await user.type(nameInput, 'Fresh Produce')

    const colorInput = screen.getAllByLabelText('aisleManager.colorLabel')[0]
    fireEvent.change(colorInput, { target: { value: '#00ff00' } })

    await user.click(screen.getByTitle('common.save'))
    await user.click(screen.getByText('aisleManager.saveChanges'))

    expect(onUpdateAisles).toHaveBeenCalledWith([
      { name: 'Fresh Produce', color: '#00ff00' },
      { name: 'Dairy', color: '#f97316' }
    ])
    expect(onClose).toHaveBeenCalled()
  })

  it('validates aisle names when adding new entries', async () => {
    const user = userEvent.setup()
    mockIsValidAisleName.mockReturnValueOnce(false)

    render(<AisleManager aisles={baseAisles} onUpdateAisles={onUpdateAisles} onClose={onClose} />)

    const addInput = screen.getByPlaceholderText('aisleManager.addPlaceholder')
    await user.type(addInput, 'New Aisle')
    await user.click(screen.getByText('common.add'))

    expect(mockIsValidAisleName).toHaveBeenCalledWith('New Aisle', ['Produce', 'Dairy'])
    expect(onUpdateAisles).not.toHaveBeenCalled()
  })

  it('resets to original aisles when clicking reset', async () => {
    const user = userEvent.setup()

    render(<AisleManager aisles={baseAisles} onUpdateAisles={onUpdateAisles} onClose={onClose} />)

    await user.click(screen.getAllByTitle('common.edit')[0])
    const nameInput = screen.getByDisplayValue('Produce')
    await user.clear(nameInput)
    await user.type(nameInput, 'Temp Name')
    await user.click(screen.getByTitle('common.save'))

    await user.click(screen.getByText('aisleManager.resetButton'))

    expect(screen.getByText('Produce')).toBeInTheDocument()
  })

  it('prevents deleting the last remaining aisle', async () => {
    const user = userEvent.setup()

    render(
      <AisleManager
        aisles={[{ name: 'Only Aisle', color: '#6b7280' }]}
        onUpdateAisles={onUpdateAisles}
        onClose={onClose}
      />
    )

    await user.click(screen.getByTitle('common.delete'))
    expect(screen.getByText('aisleManager.cannotDeleteLast')).toBeInTheDocument()
  })
})
