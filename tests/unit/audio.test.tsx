import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatSpeechText, speakText, useSpeech } from '../../src/features/audio';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('formatSpeechText', () => {
  it('formats open items in simple German', () => {
    expect(
      formatSpeechText({
        productName: 'Halloren Kugeln',
        quantity: 3
      })
    ).toBe('Drei mal Halloren Kugeln.');
  });

  it('formats packed items in simple German', () => {
    expect(
      formatSpeechText({
        productName: 'Schoko Brezeln',
        quantity: 2,
        packed: true
      })
    ).toBe('Zwei mal Schoko Brezeln.');
  });
});

describe('speakText', () => {
  it('returns false when the Web Speech API is missing', () => {
    expect(speakText('Hallo')).toBe(false);
  });

  it('uses the Web Speech API when available', () => {
    const speak = vi.fn();
    const cancel = vi.fn();

    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;

        constructor(text: string) {
          this.text = text;
        }
      }
    );

    expect(speakText('Hallo')).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toMatchObject({
      text: 'Hallo',
      lang: 'de-DE'
    });
  });
});

describe('useSpeech', () => {
  it('exposes speak and stop controls', () => {
    const speak = vi.fn();
    const cancel = vi.fn();

    vi.stubGlobal('speechSynthesis', { speak, cancel });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;

        constructor(text: string) {
          this.text = text;
        }
      }
    );

    const { result } = renderHook(() => useSpeech());

    act(() => {
      result.current.speak('Test');
    });

    expect(speak).toHaveBeenCalledTimes(1);
    expect(result.current.isSpeaking).toBe(true);
    expect(result.current.status).toBe('speaking');

    act(() => {
      result.current.stop();
    });

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.status).toBe('idle');
  });
});
