import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Device } from '../api/types';

interface DeviceCtx {
  devices: Device[];
  selectedId: string | null;
  selected: Device | null;
  setSelectedId: (id: string | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const Ctx = createContext<DeviceCtx | null>(null);

const STORAGE_KEY = 'hk:selectedDeviceId';

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null,
  );

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: api.listDevices,
    staleTime: 30_000,
  });

  // Auto-select first device when none chosen
  useEffect(() => {
    if (!selectedId && devices.length > 0) {
      setSelectedIdState(devices[0].id);
    }
    if (selectedId && devices.length > 0 && !devices.find((d) => d.id === selectedId)) {
      setSelectedIdState(devices[0].id);
    }
  }, [devices, selectedId]);

  const setSelectedId = (id: string | null) => {
    setSelectedIdState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  };

  const selected = useMemo(
    () => devices.find((d) => d.id === selectedId) ?? null,
    [devices, selectedId],
  );

  return (
    <Ctx.Provider
      value={{ devices, selectedId, selected, setSelectedId, isLoading, refetch }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDeviceContext() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDeviceContext must be used within DeviceProvider');
  return c;
}
