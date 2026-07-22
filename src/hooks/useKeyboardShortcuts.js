'use client';
import { useEffect } from 'react';

export default function useKeyboardShortcuts({ onNewSale, onPrint, onCancel, onDelete }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Avoid triggering shortcuts if user is typing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        if (event.key === 'Escape' && onCancel) {
          event.preventDefault();
          onCancel();
        }
        return;
      }

      switch (event.key) {
        case 'F2':
          if (onNewSale) {
            event.preventDefault();
            onNewSale();
          }
          break;
        case 'F7':
          if (onPrint) {
            event.preventDefault();
            onPrint();
          }
          break;
        case 'Escape':
          if (onCancel) {
            event.preventDefault();
            onCancel();
          }
          break;
        case 'Delete':
          if (onDelete) {
            event.preventDefault();
            onDelete();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNewSale, onPrint, onCancel, onDelete]);
}
