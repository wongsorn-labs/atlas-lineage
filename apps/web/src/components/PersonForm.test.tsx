import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonForm } from './PersonForm';

const noop = () => {};

describe('PersonForm', () => {
  it('renders all fields', () => {
    render(<PersonForm onSubmit={noop} onCancel={noop} />);
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
    expect(screen.getByTestId('birth-year-input')).toBeInTheDocument();
    expect(screen.getByTestId('death-year-input')).toBeInTheDocument();
    expect(screen.getByTestId('birth-lat-input')).toBeInTheDocument();
    expect(screen.getByTestId('birth-lng-input')).toBeInTheDocument();
    expect(screen.getByTestId('birth-place-input')).toBeInTheDocument();
    expect(screen.getByTestId('notes-input')).toBeInTheDocument();
  });

  it('shows "Name is required" error on empty submit', async () => {
    const user = userEvent.setup();
    render(<PersonForm onSubmit={noop} onCancel={noop} />);
    await user.click(screen.getByRole('button', { name: /add person/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with values on valid submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PersonForm onSubmit={onSubmit} onCancel={noop} />);
    await user.type(screen.getByTestId('name-input'), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /add person/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ada Lovelace' }),
        expect.anything(),
      );
    });
  });

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PersonForm onSubmit={noop} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('pre-fills values when initial prop provided and shows Update button', () => {
    const initial = {
      id: 1, name: 'Grace Hopper', birthYear: 1906, deathYear: 1992,
      birthLat: null, birthLng: null, birthPlace: 'New York', notes: 'Pioneer',
      createdAt: '', updatedAt: '',
    };
    render(<PersonForm initial={initial} onSubmit={noop} onCancel={noop} />);
    expect((screen.getByTestId('name-input') as HTMLInputElement).value).toBe('Grace Hopper');
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });
});
