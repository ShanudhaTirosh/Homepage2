import { useContext } from 'react';
import { EditModeContext } from '../context/EditModeContext';

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error('useEditMode must be used within EditModeProvider');
  return ctx;
}
