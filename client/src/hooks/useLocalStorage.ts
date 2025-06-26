import { useState, useEffect, useCallback } from 'react';

// Custom event for localStorage changes
const STORAGE_EVENT = 'local-storage-change';

// Dispatch custom event when localStorage changes
const dispatchStorageEvent = (key: string, newValue: any) => {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, {
    detail: { key, newValue }
  }));
};

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Dispatch event to notify other components
      dispatchStorageEvent(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent | StorageEvent) => {
      if (e instanceof CustomEvent) {
        // Custom event from our app
        if (e.detail.key === key) {
          setStoredValue(e.detail.newValue);
        }
      } else {
        // Native storage event from other tabs
        if (e.key === key && e.newValue) {
          try {
            setStoredValue(JSON.parse(e.newValue));
          } catch (error) {
            console.error(`Error parsing localStorage value for key "${key}":`, error);
          }
        }
      }
    };

    // Listen for our custom events
    window.addEventListener(STORAGE_EVENT, handleStorageChange as EventListener);
    
    // Listen for native storage events (from other tabs)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue] as const;
}
