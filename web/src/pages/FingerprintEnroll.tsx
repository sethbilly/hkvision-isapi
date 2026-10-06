import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Fingerprint,
  Hand,
  RefreshCw,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../api/client';
import { useDeviceContext } from '../context/DeviceContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Pill,
} from '../components/ui';

const FINGERS = [
  { no: 1, label: 'Right Thumb' },
  { no: 2, label: 'Right Index' },
  { no: 3, label: 'Right Middle' },
  { no: 4, label: 'Right Ring' },
  { no: 5, label: 'Right Little' },
  { no: 6, label: 'Left Thumb' },
  { no: 7, label: 'Left Index' },
  { no: 8, label: 'Left Middle' },
  { no: 9, label: 'Left Ring' },
  { no: 10, label: 'Left Little' },
];

interface CapturedTemplate {
  fingerNo: number;
  label: string;
  quality?: string;
  fingerData: string;
}

const STEPS = [
  { num: 1, label: 'Select User' },
  { num: 2, label: 'Choose Fingers' },
  { num: 3, label: 'Scan & Capture' },
  { num: 4, label: 'Confirm' },
];

export default function FingerprintEnroll() {
  const { devices, selected } = useDeviceContext();
  const [params] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [employeeNo, setEmployeeNo] = useState(params.get('employeeNo') ?? '');
  const [employeeName, setEmployeeName] = useState('');
  const [chosenFingers, setChosenFingers] = useState<number[]>([2]); // right index by default
  const [captured, setCaptured] = useState<CapturedTemplate[]>([]);
  const [activeFinger, setActiveFinger] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Look up user name when employeeNo changes (best-effort)
  const userQuery = useQuery({
    queryKey: ['user-lookup', selected?.id, employeeNo],
    queryFn: () => api.listUsers(selected!.id, { employeeNo }),
    enabled: !!selected && !!employeeNo && employeeNo.length >= 1,
  });

  const enrollOne = useMutation({
    mutationFn: (fingerNo: number) =>
      api.enrollFingerprint(selected!.id, { employeeNo, fingerNo }),
    onSuccess: (data, fingerNo) => {
      const label = FINGERS.find((f) => f.no === fingerNo)?.label ?? `Finger ${fingerNo}`;
      setCaptured((prev) => [
        ...prev.filter((c) => c.fingerNo !== fingerNo),
        {
          fingerNo,
          label,
          quality: data.capture.fingerPrintQuality,
          fingerData: data.capture.fingerData,
        },
      ]);
      setActiveFinger(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setActiveFinger(null);
    },
  });

  const allCaptured = useMemo(
    () => chosenFingers.every((f) => captured.find((c) => c.fingerNo === f)),
    [chosenFingers, captured],
  );

  if (!selected) {
    return (
      <EmptyState
        title="Enroll a device first"
        body="Add a Hikvision terminal in the Device Manager."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin · Fingerprint Enrollment"
        title="Confirm Enrollment."
        accent="Review and sync to devices."
        actions={
          step >= 3 && (
            <Button variant="secondary" size="sm" onClick={() => {
              setCaptured([]);
              setStep(3);
            }}>
              <RefreshCw size={14} /> Re-scan
            </Button>
          )
        }
      />

      <Stepper current={step} />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          {step === 1 && (
            <Card>
              <div className="text-sm font-semibold mb-1">Find the employee</div>
              <p className="text-ink-500 text-sm mb-4">
                Enter the employee number for the user being enrolled.
              </p>
              <label className="block">
                <span className="label">Employee No</span>
                <input
                  className="input"
                  value={employeeNo}
                  onChange={(e) => setEmployeeNo(e.target.value)}
                  placeholder="e.g. 1001"
                />
              </label>
              <label className="block mt-3">
                <span className="label">Display name (optional, for confirmation)</span>
                <input
                  className="input"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Auto-detected from device if available"
                />
              </label>
              <div className="flex justify-end mt-5">
                <Button onClick={() => setStep(2)} disabled={!employeeNo}>
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <div className="text-sm font-semibold mb-1">Choose fingers to enroll</div>
              <p className="text-ink-500 text-sm mb-4">
                Pick at least one finger. We recommend 3 for redundancy.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FINGERS.map((f) => {
                  const on = chosenFingers.includes(f.no);
                  return (
                    <button
                      key={f.no}
                      type="button"
                      onClick={() =>
                        setChosenFingers((prev) =>
                          on ? prev.filter((x) => x !== f.no) : [...prev, f.no],
                        )
                      }
                      className={clsx(
                        'flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors',
                        on
                          ? 'bg-brand-green/10 border-brand-green/40 text-brand-greenDark'
                          : 'border-ink-200 hover:bg-ink-100',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Hand size={14} /> {f.label}
                      </span>
                      {on && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between mt-5">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={chosenFingers.length === 0}
                >
                  Capture {chosenFingers.length} finger{chosenFingers.length !== 1 && 's'}
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <div className="text-sm font-semibold mb-1">Scan fingers on the terminal</div>
              <p className="text-ink-500 text-sm mb-5">
                Click a finger below, then place the matching finger on the device's
                sensor within ~20 seconds. Each scan also writes the template to the
                device against employee {employeeNo}.
              </p>
              <div className="space-y-2">
                {chosenFingers.map((fno) => {
                  const cap = captured.find((c) => c.fingerNo === fno);
                  const label = FINGERS.find((f) => f.no === fno)?.label ?? '';
                  const isActive = activeFinger === fno;
                  return (
                    <div
                      key={fno}
                      className={clsx(
                        'flex items-center justify-between px-4 py-3 rounded-lg border',
                        cap
                          ? 'bg-brand-green/5 border-brand-green/40'
                          : 'border-ink-200',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {cap ? (
                          <Check size={18} className="text-brand-green" />
                        ) : isActive ? (
                          <Loader2 size={18} className="animate-spin text-brand-amber" />
                        ) : (
                          <Fingerprint size={18} className="text-ink-400" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{label}</div>
                          <div className="text-xs text-ink-500">
                            {cap
                              ? `Captured · quality ${cap.quality ?? 'n/a'}`
                              : isActive
                              ? 'Place finger on sensor now…'
                              : 'Awaiting scan'}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={cap ? 'secondary' : 'primary'}
                        loading={isActive}
                        onClick={() => {
                          setError(null);
                          setActiveFinger(fno);
                          enrollOne.mutate(fno);
                        }}
                      >
                        {cap ? 'Re-scan' : 'Scan'}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-5">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={!allCaptured}>
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-brand-green/15 grid place-items-center">
                  <Check className="text-brand-green" />
                </div>
                <div>
                  <div className="text-lg font-semibold">All {captured.length} fingers captured!</div>
                  <p className="text-ink-500 text-sm mt-1">
                    Templates have been pushed to {selected.name}. Ask the employee to
                    place an enrolled finger on the sensor to verify.
                  </p>
                </div>
              </div>

              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 mb-2">
                Captured Fingerprint Templates
              </div>
              <div className="space-y-2">
                {captured.map((c) => (
                  <div
                    key={c.fingerNo}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-ink-200"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-brand-green" />
                      <span className="font-medium">{c.label}</span>
                    </div>
                    <Pill tone="green">Q {c.quality ?? '—'}</Pill>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  ← Re-scan fingers
                </Button>
                <Button
                  onClick={() => {
                    setStep(1);
                    setEmployeeNo('');
                    setEmployeeName('');
                    setChosenFingers([2]);
                    setCaptured([]);
                  }}
                >
                  Enroll another user
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 mb-3">
              Enrollment Guidelines
            </div>
            <ul className="space-y-3 text-sm">
              <Guide num={1} title="Enroll 3 fingers" body="Optimal redundancy. Ensures access if one finger is injured or unreadable." />
              <Guide num={2} title="Mix hands" body="Enroll fingers from both hands when possible (e.g. right index + left index)." />
              <Guide num={3} title="Clean dry fingers" body="Wash and dry hands before scanning for the best quality scores." />
              <Guide num={4} title="3 scans per finger" body="Captured 3 times and averaged. Quality threshold ≥ 60." />
            </ul>
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 mb-3">
              Selected Employee
            </div>
            {employeeNo ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-amber/20 text-brand-amber grid place-items-center font-semibold">
                  {(employeeName || employeeNo).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {employeeName ||
                      extractName(userQuery.data, employeeNo) ||
                      `Employee ${employeeNo}`}
                  </div>
                  <div className="text-xs text-ink-500 font-mono">REF-{employeeNo}</div>
                </div>
                <Pill tone="amber">Pending</Pill>
              </div>
            ) : (
              <div className="text-ink-500 text-sm flex items-center gap-2">
                <CircleAlert size={14} /> No employee selected
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 mb-3">
              Sync Targets
            </div>
            <div className="space-y-2 text-sm">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        d.id === selected.id ? 'bg-brand-green' : 'bg-ink-200',
                      )}
                    />
                    {d.name}
                  </span>
                  {d.id === selected.id && (
                    <span className="text-[11px] text-brand-greenDark">Active</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} className="flex items-center gap-3">
            <div
              className={clsx(
                'w-6 h-6 rounded-full grid place-items-center text-xs font-semibold',
                done
                  ? 'bg-brand-green text-white'
                  : active
                  ? 'bg-brand-red text-white'
                  : 'bg-ink-100 text-ink-500',
              )}
            >
              {done ? <Check size={12} /> : s.num}
            </div>
            <div
              className={clsx(
                'text-xs',
                active ? 'text-ink-900 font-semibold' : 'text-ink-500',
              )}
            >
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-10 h-px bg-ink-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Guide({ num, title, body }: { num: number; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-5 h-5 rounded-full bg-brand-red/10 text-brand-red text-[10px] font-bold grid place-items-center mt-0.5">
        {num}
      </span>
      <div>
        <div className="font-medium leading-tight">{title}</div>
        <div className="text-ink-500 text-[12.5px] leading-snug mt-0.5">{body}</div>
      </div>
    </li>
  );
}

function extractName(data: any, employeeNo: string): string | null {
  const list = data?.UserInfoSearch?.UserInfo ?? data?.UserInfo ?? [];
  const arr = Array.isArray(list) ? list : [list];
  const u = arr.find((x: any) => String(x?.employeeNo) === employeeNo);
  return u?.name ?? null;
}
