import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Fingerprint,
  Hand,
  RefreshCw,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
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

const FINGER_LABELS: Record<number, string> = {
  1: 'Right Thumb',
  2: 'Right Index',
  3: 'Right Middle',
  4: 'Right Ring',
  5: 'Right Little',
  6: 'Left Thumb',
  7: 'Left Index',
  8: 'Left Middle',
  9: 'Left Ring',
  10: 'Left Little',
};

interface FpRow {
  employeeNo: string;
  fingerNo: number;
  label: string;
  cardReaderNo?: number;
  fingerData?: string;
  quality?: string | number;
}

function extractFingers(data: any): FpRow[] {
  if (!data) return [];
  // Hikvision responses vary by firmware — handle the most common shapes.
  const candidates = [
    data?.FingerPrintInfo?.FingerPrintList,
    data?.FingerPrintInfoSearch?.FingerPrintList,
    data?.FingerPrintInfoSearch?.FingerPrintInfo,
    data?.FingerPrintInfoSearch?.InfoList,
    data?.FingerPrintList,
    data?.InfoList,
    Array.isArray(data) ? data : null,
  ].filter(Boolean);

  const list = candidates[0] ?? [];
  const arr = Array.isArray(list) ? list : [list];

  return arr
    .filter(
      (f: any) =>
        f && (f.fingerPrintID ?? f.fingerNo ?? f.FingerNo) != null,
    )
    .map((f: any) => {
      const no = Number(f.fingerPrintID ?? f.fingerNo ?? f.FingerNo);
      return {
        employeeNo: String(f.employeeNo ?? f.EmployeeNo ?? ''),
        fingerNo: no,
        label: FINGER_LABELS[no] ?? `Finger ${no}`,
        cardReaderNo: f.cardReaderNo,
        fingerData: f.fingerData,
        quality: f.fingerPrintQuality ?? f.quality,
      };
    })
    .sort((a, b) => a.fingerNo - b.fingerNo);
}

export default function Fingerprints() {
  const qc = useQueryClient();
  const { selected } = useDeviceContext();
  const [draft, setDraft] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const query = useQuery({
    queryKey: ['fingerprints', selected?.id, employeeNo],
    queryFn: () => api.listFingerprints(selected!.id, { employeeNo }),
    enabled: !!selected && !!employeeNo,
  });

  const fingers = useMemo(() => extractFingers(query.data), [query.data]);

  const delOne = useMutation({
    mutationFn: (fingerNo: number) =>
      api.deleteFingerprints(selected!.id, { employeeNo, fingerNo }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['fingerprints', selected?.id, employeeNo] }),
  });

  const delAll = useMutation({
    mutationFn: () => api.deleteFingerprints(selected!.id, { employeeNo }),
    onSuccess: () => {
      setConfirmAll(false);
      qc.invalidateQueries({ queryKey: ['fingerprints', selected?.id, employeeNo] });
    },
  });

  if (!selected) {
    return (
      <EmptyState
        title="No device selected"
        body="Enroll or select a Hikvision terminal to manage fingerprints."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · Fingerprint Registry"
        title="Enrolled Fingerprints."
        accent="View and revoke templates bound to a user."
        actions={
          <>
            <Link to="/enroll">
              <Button variant="secondary" size="sm">
                <Fingerprint size={14} /> Enroll New
              </Button>
            </Link>
            {employeeNo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => query.refetch()}
                loading={query.isFetching}
              >
                <RefreshCw size={14} /> Refresh
              </Button>
            )}
          </>
        }
      />

      {/* Lookup */}
      <Card className="mb-5">
        <form
          className="flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setEmployeeNo(draft.trim());
          }}
        >
          <label className="flex-1 block">
            <span className="label">Employee No</span>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                className="input pl-9"
                placeholder="e.g. 1001"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                required
              />
            </div>
          </label>
          <Button type="submit" loading={query.isFetching && !!employeeNo}>
            Look up
          </Button>
        </form>
      </Card>

      {query.error && <ErrorBanner message={(query.error as Error).message} />}

      {employeeNo && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatTile
              label="Employee"
              value={`REF-${employeeNo}`}
              icon={<Hand size={18} />}
              tone="green"
            />
            <StatTile
              label="Fingers Enrolled"
              value={query.isLoading ? '…' : fingers.length}
              icon={<Fingerprint size={18} />}
              tone="green"
            />
            <StatTile label="Device" value={selected.name} tone="neutral" />
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
                Fingerprint Templates on Device
              </div>
              {fingers.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmAll(true)}
                >
                  <Trash2 size={14} className="text-brand-red" /> Delete all
                </Button>
              )}
            </div>

            {query.isLoading ? (
              <div className="p-10 text-center text-ink-500 text-sm">Loading…</div>
            ) : fingers.length === 0 ? (
              <EmptyState
                title="No fingerprints on file"
                body={`Employee ${employeeNo} has no fingerprint templates enrolled on ${selected.name}.`}
                action={
                  <Link to={`/enroll?employeeNo=${employeeNo}`}>
                    <Button>
                      <Fingerprint size={14} /> Enroll fingers
                    </Button>
                  </Link>
                }
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-ink-100/40 text-ink-500 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">#</th>
                    <th className="text-left px-3 py-2.5 font-medium">Finger</th>
                    <th className="text-left px-3 py-2.5 font-medium">Reader</th>
                    <th className="text-left px-3 py-2.5 font-medium">Quality</th>
                    <th className="text-left px-3 py-2.5 font-medium">Template</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fingers.map((f) => (
                    <tr
                      key={f.fingerNo}
                      className="border-t border-ink-100 row-hover"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">
                        {f.fingerNo}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Fingerprint size={14} className="text-brand-green" />
                          <span className="font-medium">{f.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        {f.cardReaderNo ?? '1'}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone="green">{f.quality ?? '—'}</Pill>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-ink-500 truncate max-w-[240px]">
                        {f.fingerData
                          ? `${f.fingerData.slice(0, 20)}…`
                          : 'stored on device'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={delOne.isPending && delOne.variables === f.fingerNo}
                          onClick={() =>
                            confirm(
                              `Delete ${f.label} for employee ${employeeNo}?`,
                            ) && delOne.mutate(f.fingerNo)
                          }
                          title="Delete this finger"
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
      )}

      {/* Delete-all confirm */}
      {confirmAll && (
        <div
          className="fixed inset-0 bg-ink-900/40 grid place-items-center z-50 p-4"
          onClick={() => setConfirmAll(false)}
        >
          <div
            className="bg-paper rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-brand-red/15 grid place-items-center">
                <AlertTriangle size={18} className="text-brand-red" />
              </div>
              <div>
                <div className="text-base font-semibold">
                  Delete all fingerprints?
                </div>
                <p className="text-sm text-ink-500 mt-1">
                  This removes every fingerprint template for employee{' '}
                  <span className="font-mono">{employeeNo}</span> from{' '}
                  <span className="font-semibold">{selected.name}</span>. The user
                  record is <em>not</em> deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={delAll.isPending}
                onClick={() => delAll.mutate()}
              >
                Delete all
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
