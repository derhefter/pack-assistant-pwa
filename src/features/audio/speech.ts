import type { OrderItemSpeechTarget } from './types';

const GERMAN_NUMBERS: Record<number, string> = {
  0: 'Null',
  1: 'Ein',
  2: 'Zwei',
  3: 'Drei',
  4: 'Vier',
  5: 'Fuenf',
  6: 'Sechs',
  7: 'Sieben',
  8: 'Acht',
  9: 'Neun',
  10: 'Zehn',
  11: 'Elf',
  12: 'Zwoelf',
  13: 'Dreizehn',
  14: 'Vierzehn',
  15: 'Fuenfzehn',
  16: 'Sechzehn',
  17: 'Siebzehn',
  18: 'Achtzehn',
  19: 'Neunzehn',
  20: 'Zwanzig'
};

function normalizeProductName(productName: string): string {
  return productName
    .trim()
    .replace(/[;:()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function formatQuantity(quantity: number): string {
  const safeQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;
  return GERMAN_NUMBERS[safeQuantity] ?? String(safeQuantity);
}

export interface SpeakTextOptions {
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

function selectBestGermanVoice(speechSynthesis: SpeechSynthesis) {
  const voices = speechSynthesis.getVoices();
  const germanVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('de'));
  if (!germanVoices.length) {
    return undefined;
  }

  const preferredMarkers = ['natural', 'neural', 'google', 'microsoft', 'katja', 'anna', 'petra'];
  return (
    germanVoices.find((voice) =>
      preferredMarkers.some((marker) => voice.name.toLowerCase().includes(marker))
    ) ?? germanVoices[0]
  );
}

export function formatSpeechText(orderItem: OrderItemSpeechTarget): string {
  const quantityText = formatQuantity(orderItem.quantity);
  const productName = normalizeProductName(orderItem.productName);

  return `${quantityText} mal ${productName}.`;
}

function getSpeechEnvironment() {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechSynthesis = window.speechSynthesis;
  const SpeechSynthesisUtteranceConstructor = window.SpeechSynthesisUtterance;

  if (!speechSynthesis || !SpeechSynthesisUtteranceConstructor) {
    return null;
  }

  return { speechSynthesis, SpeechSynthesisUtteranceConstructor };
}

export function speakText(text: string, options: SpeakTextOptions = {}): boolean {
  const environment = getSpeechEnvironment();
  if (!environment || !text.trim()) {
    return false;
  }

  const { lang = 'de-DE', onStart, onEnd, onError } = options;
  const { speechSynthesis, SpeechSynthesisUtteranceConstructor } = environment;
  const utterance = new SpeechSynthesisUtteranceConstructor(text);
  const selectedVoice = selectBestGermanVoice(speechSynthesis);

  utterance.lang = lang;
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = 0.95;
  utterance.pitch = 0.98;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);

  return true;
}
