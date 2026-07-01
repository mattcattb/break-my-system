import {useCallback, useState} from "react";

export function useClipboard(resetAfterMs = 1_500) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(
    async (value: string) => {
      setError(null);

      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch {
        setCopied(false);
        setError("Unable to copy to clipboard");
        return false;
      }
    },
    [resetAfterMs],
  );

  return {copied, error, copy};
}
