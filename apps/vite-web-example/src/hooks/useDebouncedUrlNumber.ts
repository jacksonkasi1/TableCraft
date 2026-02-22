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

  // Sync URL -> local (when URL changes externally)
  useEffect(() => {
    const currentNum = Number(localValue) || 0;
    if (currentNum !== urlValue) {
      setLocalValue(urlValue > 0 ? String(urlValue) : '');
    }
  }, [urlValue]); // localValue intentionally omitted to prevent loops

  return [urlValue, localValue, setLocalValue] as const;
}