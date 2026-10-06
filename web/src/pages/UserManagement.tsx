import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Plus, Search, Pencil, Trash2, Users, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DeviceUser } from '../api/types';
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

interface UserRow {
  employeeNo: string;
  name: string;
  userType?: string;
  gender?: string;
}

function extractUsers(data: any): UserRow[] {
  if (!data) return [];
  const list = data?.UserInfoSearch?.UserInfo ?? data?.UserInfo ?? [];
  const arr = Array.isArray(list) ? list : [list];
  return arr
    .filter((u: any) => u?.employeeNo)
    .map((u: any) => ({
      employeeNo: String(u.employeeNo),
      name: u.name ?? '',
      userType: u.userType,
      gender: u.gender,
    }));
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '·';

export default function UserManagement() {
  const qc = useQueryClient();
  const { selected } = useDeviceContext();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', selected?.id],
    queryFn: () => api.listUsers(selected!.id, { limit: 200 }),
    enabled: !!selected,
  });

  const users = useMemo(() => extractUsers(data), [data]);
  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !search ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.employeeNo.includes(search),
      ),
    [users, search],
  );

  const removeUser = useMutation({
    mutationFn: (employeeNo: string) => api.deleteUser(selected!.id, employeeNo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', selected?.id] }),
  });

  if (!selected) {
    return (
      <EmptyState
        title="No device selected"
        body="Enroll or select a Hikvision terminal to manage its users."
        action={
          <Link to="/devices">
            <Button>Go to Device Manager</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · User Management"
        title="User Registry."
        accent="Enroll, manage, and control access."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter size={14} /> Filter
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} /> Enroll New User
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatTile
          label="Total Users"
          value={users.length}
          icon={<Users size={18} />}
          tone="green"
        />
        <StatTile
          label="FP Enrolled"
          value="—"
          icon={<Fingerprint size={18} />}
          tone="green"
        />
        <StatTile label="Pending Enroll" value="—" tone="amber" />
        <StatTile label="Disabled" value="—" tone="red" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              placeholder="Search by name, ID, or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-ink-200 rounded-md bg-white focus:outline-none focus:border-brand-green/60"
            />
          </div>
          <select className="text-xs border border-ink-200 rounded-md px-2 py-2 bg-white">
            <option>All Departments</option>
          </select>
          <select className="text-xs border border-ink-200 rounded-md px-2 py-2 bg-white">
            <option>All Status</option>
          </select>
        </div>

        {error && <div className="p-4"><ErrorBanner message={(error as Error).message} /></div>}

        {isLoading ? (
          <div className="p-10 text-center text-ink-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={users.length === 0 ? 'No users on this device' : 'No matches'}
            body={users.length === 0 ? 'Add your first user to start enrolling fingerprints.' : 'Try a different search.'}
            action={users.length === 0 && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add User
              </Button>
            )}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-100/40 text-ink-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Employee</th>
                <th className="text-left px-3 py-2.5 font-medium">Type</th>
                <th className="text-left px-3 py-2.5 font-medium">Gender</th>
                <th className="text-left px-3 py-2.5 font-medium">Access Level</th>
                <th className="text-left px-3 py-2.5 font-medium">FP Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.employeeNo} className="border-t border-ink-100 row-hover">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-amber/20 text-brand-amber grid place-items-center text-xs font-semibold">
                        {initials(u.name || u.employeeNo)}
                      </div>
                      <div>
                        <div className="font-medium">{u.name || '—'}</div>
                        <div className="text-[11px] text-ink-500 font-mono">
                          REF-{u.employeeNo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 capitalize">{u.userType ?? 'normal'}</td>
                  <td className="px-3 py-3 capitalize">{u.gender ?? '—'}</td>
                  <td className="px-3 py-3">
                    <Pill tone="green">Full</Pill>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone="amber">Pending</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(u)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Link to={`/enroll?employeeNo=${u.employeeNo}`}>
                      <Button variant="ghost" size="sm" title="Enroll fingerprint">
                        <Fingerprint size={14} className="text-brand-green" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        confirm(`Delete ${u.name || u.employeeNo}?`) &&
                        removeUser.mutate(u.employeeNo)
                      }
                      title="Delete"
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

      {(showAdd || editing) && (
        <UserModal
          deviceId={selected.id}
          editing={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function UserModal({
  deviceId,
  editing,
  onClose,
}: {
  deviceId: string;
  editing: UserRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DeviceUser>({
    employeeNo: editing?.employeeNo ?? '',
    name: editing?.name ?? '',
    userType: (editing?.userType as any) ?? 'normal',
    gender: (editing?.gender as any) ?? 'unknown',
  });
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      editing
        ? api.updateUser(deviceId, editing.employeeNo, form)
        : api.addUser(deviceId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', deviceId] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 grid place-items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold mb-4">
          {editing ? 'Edit user' : 'Add new user'}
        </div>
        {err && <ErrorBanner message={err} />}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-3 mt-3"
        >
          <label className="block">
            <span className="label">Employee No</span>
            <input
              className="input"
              required
              disabled={!!editing}
              value={form.employeeNo}
              onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Full name</span>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">User type</span>
              <select
                className="input"
                value={form.userType}
                onChange={(e) =>
                  setForm({ ...form, userType: e.target.value as any })
                }
              >
                <option value="normal">Normal</option>
                <option value="visitor">Visitor</option>
                <option value="blackList">Blacklist</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Gender</span>
              <select
                className="input"
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value as any })
                }
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
