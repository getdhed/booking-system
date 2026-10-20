import { useEffect, useState } from 'react';

// Хук хранит список в состоянии React и в localStorage браузера.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  // Один раз при открытии приложения читаем ранее сохранённые данные.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setValue(parsed);
        }
      }
    } catch (error) {
      console.warn('Ошибка чтения localStorage:', error);
    }
    setLoaded(true);
  }, [key]);

  // Когда список меняется, сохраняем его. До загрузки не перезаписываем старые данные.
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Ошибка сохранения localStorage:', error);
    }
  }, [key, value, loaded]);

  return [value, setValue];
}
