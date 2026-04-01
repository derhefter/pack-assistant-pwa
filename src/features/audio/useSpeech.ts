import { useCallback, useEffect, useRef, useState } from 'react';
import { speakText } from './speech';

type SpeechStatus = 'idle' | 'speaking' | 'error';

function hasSpeechSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

export function useSpeech() {
  const [supported] = useState(hasSpeechSupport());
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setIsSpeaking(false);
    setStatus('idle');
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setStatus('idle');
        return false;
      }

      const started = speakText(text, {
        onStart: () => {
          speakingRef.current = true;
          setIsSpeaking(true);
          setStatus('speaking');
        },
        onEnd: () => {
          speakingRef.current = false;
          setIsSpeaking(false);
          setStatus('idle');
        },
        onError: () => {
          speakingRef.current = false;
          setIsSpeaking(false);
          setStatus('error');
        }
      });

      if (!started) {
        speakingRef.current = false;
        setIsSpeaking(false);
      }

      speakingRef.current = started;
      if (!started) {
        setStatus('error');
      }

      return started;
    },
    []
  );

  return {
    supported,
    status,
    isSpeaking,
    speak,
    stop
  };
}
