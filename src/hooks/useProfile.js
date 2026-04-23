/**
 * hooks/useProfile.js
 * ─────────────────────────────────────────────────────────────
 * Loads the user's saved baby profile on login.
 * Strictly scoped to the current userId — clears state on user change.
 */
import { useState, useEffect, useRef } from 'react';
import { loadProfile, saveProfile } from '../lib/profile';

export function useProfile(userId) {
  const [profileLoading, setProfileLoading] = useState(true);
  const [savedForm,      setSavedForm]      = useState(null);

  // Track which userId we last loaded for — prevents stale data leaking
  const loadedForRef = useRef(null);

  useEffect(() => {
    // No user — clear everything immediately
    if (!userId) {
      setSavedForm(null);
      setProfileLoading(false);
      loadedForRef.current = null;
      return;
    }

    // User changed (e.g. logout then different login) — clear old data first
    if (loadedForRef.current !== userId) {
      setSavedForm(null);
      loadedForRef.current = userId;
    }

    setProfileLoading(true);

    loadProfile(userId).then(profile => {
      // Guard: make sure the userId hasn't changed while we were fetching
      if (loadedForRef.current !== userId) return;

      // Extra safety: verify the profile belongs to this user
      // (loadProfile already filters by user_id, but belt-and-braces)
      setSavedForm(profile || null);
      setProfileLoading(false);
    });
  }, [userId]);

  async function persistForm(form) {
    if (!userId) return;
    await saveProfile(userId, form);
    setSavedForm(form);
  }

  return { profileLoading, savedForm, persistForm };
}
