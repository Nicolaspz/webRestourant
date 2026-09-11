'use client';

import { useCallback, useEffect, useState } from 'react';
import { organizationService } from '@/services/organization';
import { DEFAULT_POS_SETTINGS, normalizePosSettings, type PosSettings } from '@/types/pos-settings';

const cache = new Map<string, PosSettings>();
const requests = new Map<string, Promise<PosSettings>>();
const listeners = new Map<string, Set<(settings: PosSettings) => void>>();

const publish = (organizationId: string, settings: PosSettings) => {
  cache.set(organizationId, settings);
  listeners.get(organizationId)?.forEach(listener => listener(settings));
};

const load = (organizationId: string, force = false) => {
  if (!force && cache.has(organizationId)) return Promise.resolve(cache.get(organizationId)!);
  if (!force && requests.has(organizationId)) return requests.get(organizationId)!;

  const request = organizationService.getById(organizationId)
    .then(organization => {
      const settings = normalizePosSettings(organization.posSettings);
      publish(organizationId, settings);
      return settings;
    })
    .finally(() => requests.delete(organizationId));
  requests.set(organizationId, request);
  return request;
};

export function usePosSettings(organizationId?: string) {
  const [settings, setSettings] = useState<PosSettings>(() =>
    organizationId ? cache.get(organizationId) || DEFAULT_POS_SETTINGS : DEFAULT_POS_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(Boolean(organizationId && !cache.has(organizationId)));

  useEffect(() => {
    if (!organizationId) return;
    const subscribers = listeners.get(organizationId) || new Set();
    subscribers.add(setSettings);
    listeners.set(organizationId, subscribers);
    setIsLoading(!cache.has(organizationId));
    load(organizationId).catch(() => undefined).finally(() => setIsLoading(false));
    return () => {
      subscribers.delete(setSettings);
      if (subscribers.size === 0) listeners.delete(organizationId);
    };
  }, [organizationId]);

  const refresh = useCallback(async () => {
    if (!organizationId) return DEFAULT_POS_SETTINGS;
    setIsLoading(true);
    try {
      return await load(organizationId, true);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const updateCachedSettings = useCallback((next: Partial<PosSettings>) => {
    if (!organizationId) return;
    publish(organizationId, normalizePosSettings({ ...settings, ...next }));
  }, [organizationId, settings]);

  return { settings, isLoading, refresh, updateCachedSettings };
}
