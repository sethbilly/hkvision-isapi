import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HardDrive, Trash2, Plus, RefreshCw, Wifi } from 'lucide-react';
import { api } from '../api/client';
import type { DeviceEnrollInput } from '../api/types';
import { useDeviceContext } from '../context/DeviceContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Pill,
  StatTile,
} from '../components/ui';

const empty: DeviceEnrollInput = {
  name: '',
  host: '',
  port: 80,
  https: false,
  username: 'admin',
  password: '',
  registerWebhook: false,
};

export default function DeviceEnroll() {
  const qc = useQueryClient();
  const { devices, refetch, isLoading } = useDeviceContext();
  const [form, setForm] = useState<DeviceEnrollInput>(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = useMutation({
    mutationFn: (input: DeviceEnrollInput) => api.enrollDevice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      setForm(empty);
      setShowForm(false);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  const total = devices.length;
  const online = devices.length; // backend doesn't currently expose status — assume all
  const offline = 0;

  return (
    <>
      <PageHeader
        eyebrow="Governance · HikVision Manager"
        title="Device Registry."
        accent="Enroll, sync, and operate biometric terminals."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus size={14} /> Enroll Device
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Registered"
          value={total}
          icon={<HardDrive size={18} />}
          tone="green"
        />
        <StatTile label="Online" value={online} icon={<Wifi size={18} />} tone="green" />
        <StatTile label="Offline" value={offline} tone="amber" />
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="text-sm font-semibold mb-4">Enroll new terminal</div>
          {error && <ErrorBanner message={error} />}
          <form
            className="grid grid-cols-2 gap-4 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              enroll.mutate(form);
            }}
          >
            <Field label="Display name">
              <input
                className="input"
                required
                placeholder="Front Door"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Host / IP">
              <input
                className="input"
                required
                placeholder="172.25.29.131"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </Field>
            <Field label="Port">
              <input
                type="number"
                className="input"
                value={form.port ?? 80}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              />
            </Field>
            <Field label="HTTPS">
              <select
                className="input"
                value={form.https ? '1' : '0'}
                onChange={(e) => setForm({ ...form, https: e.target.value === '1' })}
              >
                <option value="0">No (HTTP)</option>
                <option value="1">Yes (HTTPS)</option>
              </select>
            </Field>
            <Field label="Username">
              <input
                className="input"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Register webhook (real-time events)">
              <select
                className="input"
                value={form.registerWebhook ? '1' : '0'}
                onChange={(e) =>
                  setForm({ ...form, registerWebhook: e.target.value === '1' })
                }
              >
                <option value="0">No (poll only)</option>
                <option value="1">Yes</option>
              </select>
            </Field>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={enroll.isPending}>
                Enroll Device
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
            Enrolled Terminals
          </div>
          <div className="text-xs text-ink-500">{total} total</div>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-ink-500 text-sm">Loading…</div>
        ) : devices.length === 0 ? (
          <EmptyState
            title="No devices enrolled yet"
            body="Add your first Hikvision biometric terminal to get started."
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={14} /> Enroll Device
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-100/40 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Name</th>
                <th className="text-left px-3 py-2.5 font-medium">Host</th>
                <th className="text-left px-3 py-2.5 font-medium">Model</th>
                <th className="text-left px-3 py-2.5 font-medium">Serial</th>
                <th className="text-left px-3 py-2.5 font-medium">Firmware</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-t border-ink-100 row-hover">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-3 py-3 text-ink-500 font-mono text-xs">
                    {d.host}:{d.port}
                  </td>
                  <td className="px-3 py-3 text-ink-700">{d.model ?? '—'}</td>
                  <td className="px-3 py-3 text-ink-500 font-mono text-xs">
                    {d.serial ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-ink-700">{d.firmware ?? '—'}</td>
                  <td className="px-3 py-3">
                    <Pill tone="green">Online</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        confirm(`Remove ${d.name}? This only removes it from this app, not the device itself.`) &&
                        remove.mutate(d.id)
                      }
                    >
                      <Trash2 size={14} className="text-brand-red" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
