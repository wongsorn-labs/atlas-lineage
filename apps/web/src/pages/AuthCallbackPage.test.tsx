import { render, screen, waitFor } from '@testing-library/react';
import { AuthCallbackPage } from './AuthCallbackPage';

const completeOAuthCallback = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ completeOAuthCallback }),
}));

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    completeOAuthCallback.mockReset();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, replace: vi.fn() },
    });
  });

  it('navigates home once the OAuth session is handed off successfully', async () => {
    completeOAuthCallback.mockResolvedValue(undefined);
    render(<AuthCallbackPage />);

    await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/'));
  });

  it('shows an error with a way back to the login page when the handoff fails', async () => {
    completeOAuthCallback.mockRejectedValue(new Error('Invalid or expired session'));
    render(<AuthCallbackPage />);

    await waitFor(() => expect(screen.getByText('Invalid or expired session')).toBeVisible());
    expect(screen.getByRole('link', { name: /back to login/i })).toBeVisible();
    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
