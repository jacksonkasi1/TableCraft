import { useState, useEffect } from 'react';
import { useUrlState } from '@tablecraft/table';

export function useDebouncedUrlNumber(key: string, defaultValue: number = 0, delayMs: number = 400) {
  const [urlValue, setUrlValue] = useUrlState<number>(key, defaultValue);
  const [localValue, setLocalValue] = useState<string>(urlValue > 0 ? String(urlValue) : '');

  // Sync local -> URL (with debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      setUrlValue(Number(localValue) || 0);
    }, delayMs);
    return () => clearTimeout(handler);
  }, [localValue, setUrlValue, delayMs]);

  // Sync URL -> local (when URL changes externally), adjusted during render
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (urlValue !== prevUrlValue) {
    setPrevUrlValue(urlValue);
    if ((Number(localValue) || 0) !== urlValue) {
      setLocalValue(urlValue > 0 ? String(urlValue) : '');
    }
  }

  return [urlValue, localValue, setLocalValue] as const;
}