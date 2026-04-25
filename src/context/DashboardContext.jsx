/**
 * DashboardContext — Provides links, categories, and CRUD operations.
 * Uses Firestore real-time subscriptions for live data sync.
 */
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  subscribeLinks, subscribeCategories,
  addLink as fbAddLink, updateLink as fbUpdateLink,
  deleteLink as fbDeleteLink, reorderLinks as fbReorderLinks,
  addCategory as fbAddCategory, updateCategory as fbUpdateCategory,
  deleteCategory as fbDeleteCategory,
} from '../firebase/firestore';

export const DashboardContext = createContext(null);

export function DashboardProvider({ uid, children }) {
  const [links, setLinks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Subscribe to links
  useEffect(() => {
    if (!uid) return;
    setLinksLoading(true);
    const unsub = subscribeLinks(uid, (data) => {
      setLinks(data);
      setLinksLoading(false);
    });
    return unsub;
  }, [uid]);

  // Subscribe to categories
  useEffect(() => {
    if (!uid) return;
    setCategoriesLoading(true);
    const unsub = subscribeCategories(uid, (data) => {
      setCategories(data);
      setCategoriesLoading(false);
    });
    return unsub;
  }, [uid]);

  // CRUD: Links
  const addLink = useCallback(
    async (data) => await fbAddLink(uid, data),
    [uid]
  );

  const updateLink = useCallback(
    async (linkId, data) => await fbUpdateLink(uid, linkId, data),
    [uid]
  );

  const deleteLink = useCallback(
    async (linkId) => await fbDeleteLink(uid, linkId),
    [uid]
  );

  const reorderLinks = useCallback(
    async (orderedLinks) => await fbReorderLinks(uid, orderedLinks),
    [uid]
  );

  // CRUD: Categories
  const addCategory = useCallback(
    async (data) => await fbAddCategory(uid, data),
    [uid]
  );

  const updateCategory = useCallback(
    async (catId, data) => await fbUpdateCategory(uid, catId, data),
    [uid]
  );

  const deleteCategory = useCallback(
    async (catId) => await fbDeleteCategory(uid, catId),
    [uid]
  );

  const loading = linksLoading || categoriesLoading;

  const value = useMemo(
    () => ({
      links,
      categories,
      loading,
      addLink,
      updateLink,
      deleteLink,
      reorderLinks,
      addCategory,
      updateCategory,
      deleteCategory,
    }),
    [links, categories, loading, addLink, updateLink, deleteLink, reorderLinks, addCategory, updateCategory, deleteCategory]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
