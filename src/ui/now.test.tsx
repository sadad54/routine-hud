// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';

afterEach(cleanup);

/** Load the app modules fresh with a given ?now= so the clock picks it up. */
async function renderAt(query: string) {
  vi.resetModules();
  window.history.replaceState(null, '', `/${query}`);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { useApp } = await import('../store/app');
  const { NowScreen } = await import('./NowScreen');
  await act(async () => {
    await useApp.getState().init();
  });
  return render(<NowScreen />);
}

describe('Now HUD with ?now=', () => {
  it('2026-10-23T12:50 (Friday) shows Jumu’ah with 55:00 left and Transition next', async () => {
    const { unmount } = await renderAt('?now=2026-10-23T12:50');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jumu’ah');
    expect(screen.getByRole('timer')).toHaveTextContent('55:00');
    const nextCard = screen.getByText('Next').parentElement!;
    expect(within(nextCard).getByText('Transition')).toBeInTheDocument();
    expect(within(nextCard).getByText('13:45')).toBeInTheDocument();
    expect(screen.getByText('12:45 – 13:45')).toBeInTheDocument();
    unmount();
  });

  it('2026-10-19T07:00 shows Deep Work 1 with the sprint sub-timer', async () => {
    const { unmount } = await renderAt('?now=2026-10-19T07:00');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Deep Work 1');
    expect(screen.getByRole('timer')).toHaveTextContent('2:30:00');
    expect(screen.getByText(/Sprint 1\/2 · 55:00/)).toBeInTheDocument();
    unmount();
  });

  it('2026-10-20T02:00 shows last night’s Sleep counting down to 05:30', async () => {
    const { unmount } = await renderAt('?now=2026-10-20T02:00');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sleep');
    expect(screen.getByRole('timer')).toHaveTextContent('3:30:00');
    unmount();
  });

  it('shows the amber state 5 minutes before the end', async () => {
    const { unmount } = await renderAt('?now=2026-10-19T11:55:30');
    expect(screen.getByText(/Five minutes — start wrapping up/)).toBeInTheDocument();
    unmount();
  });
});
