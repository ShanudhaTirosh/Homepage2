/**
 * EditModeContext — Controls the edit mode toggle for the dashboard.
 * When edit mode is ON: drag handles, edit/delete buttons are visible on link cards.
 * "Add Link" auto-activates edit mode if it's off.
 */
import { createContext, useState, useCallback, useMemo } from 'react';

export const EditModeContext = createContext(null);

export function EditModeProvider({ children }) {
  const [editMode, setEditMode] = useState(false);

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  const enableEditMode = useCallback(() => {
    setEditMode(true);
  }, []);

  const disableEditMode = useCallback(() => {
    setEditMode(false);
  }, []);

  const value = useMemo(
    () => ({ editMode, toggleEditMode, enableEditMode, disableEditMode }),
    [editMode, toggleEditMode, enableEditMode, disableEditMode]
  );

  return (
    <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
  );
}
