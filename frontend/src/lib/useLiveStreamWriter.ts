import { useState, useEffect, useRef, useCallback } from "react";

export interface LiveStreamOptions {
  speedMs?: number; // Milliseconds per character or token chunk
  onComplete?: () => void;
  chunkSize?: number; // Number of characters per interval
}

export function useLiveStreamWriter(options: LiveStreamOptions = {}) {
  const { speedMs = 15, chunkSize = 2, onComplete } = options;
  const [writtenText, setWrittenText] = useState<string>("");
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const fullTextRef = useRef<string>("");
  const currentIndexRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Stop writing interval
  const stopStreaming = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsWriting(false);
  }, []);

  // Clear text
  const resetStream = useCallback(() => {
    stopStreaming();
    setWrittenText("");
    setProgress(0);
    fullTextRef.current = "";
    currentIndexRef.current = 0;
  }, [stopStreaming]);

  // Start streaming text live char-by-char or chunk-by-chunk
  const startStreaming = useCallback(
    (targetText: string, speedOverride?: number) => {
      stopStreaming();
      fullTextRef.current = targetText;
      currentIndexRef.current = 0;
      setWrittenText("");
      setProgress(0);
      setIsWriting(true);

      const ms = speedOverride ?? speedMs;

      timerRef.current = setInterval(() => {
        const nextIndex = Math.min(
          currentIndexRef.current + chunkSize,
          fullTextRef.current.length
        );
        currentIndexRef.current = nextIndex;

        const currentSlice = fullTextRef.current.slice(0, nextIndex);
        setWrittenText(currentSlice);

        const currentProgress = Math.round(
          (nextIndex / Math.max(fullTextRef.current.length, 1)) * 100
        );
        setProgress(currentProgress);

        if (nextIndex >= fullTextRef.current.length) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsWriting(false);
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      }, ms);
    },
    [speedMs, chunkSize, stopStreaming]
  );

  // Instantly finish writing without waiting
  const finishImmediately = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setWrittenText(fullTextRef.current);
    setProgress(100);
    setIsWriting(false);
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  // Append new incoming chunk dynamically (for real SSE / stream response)
  const appendChunk = useCallback((chunk: string) => {
    fullTextRef.current += chunk;
    setWrittenText((prev) => prev + chunk);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    writtenText,
    isWriting,
    progress,
    startStreaming,
    finishImmediately,
    resetStream,
    stopStreaming,
    appendChunk,
    setWrittenText,
  };
}
