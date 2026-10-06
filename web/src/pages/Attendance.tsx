import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Search, Filter, Download } from 'lucide-react';
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

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function Attendance() {
  const { selected } = useDeviceContext();
  const [employeeNo, setEmployeeNo] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [grantedOnly, setGrantedOnly] = useState(true);

  const query = useQuery({
    queryKey: ['attendance', selected?.id, employeeNo, startDate, endDate, grantedOnly],
    queryFn: () =>
      api.getAttendance(selected!.id, {
        employeeNo: employeeNo || undefined,
        startDate,
        endDate,
        grantedOnly,
      }),
    enabled: !!selected,
  });

  if (!selected) {
    return (
      <EmptyState
        title="Enroll a device first"
        body="Add a Hikvision terminal to view attendance."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance · Attendance"
        title="Every clock-in, recorded."
        accent="Filter by employee, date range, and verification result."
        actions={
          <Button variant="secondary" size="sm" disabled>
            <Download size={14} /> Export PDF
          </Button>
        }
      />

      <Card className="mb-5">
        <form
          className="grid grid-cols-12 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            query.refetch();
          }}
        >
          <label className="col-span-3 block">
            <span className="label">Employee No (optional)</span>
            <input
              className="input"
              placeholder="All employees"
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
            />
          </label>
          <label className="col-span-3 block">
            <span className="label">Start date</span>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="date"
                className="input pl-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
          </label>
          <label className="col-span-3 block">
            <span className="label">End date</span>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="date"
                className="input pl-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={today()}
              />
            </div>
          </label>
          <label className="col-span-2 block">
            <span className="label">Result</span>
            <select
              className="input"
              value={grantedOnly ? '1' : '0'}
              onChange={(e) => setGrantedOnly(e.target.value === '1')}
            >
              <option value="1">Granted only</option>
              <option value="0">All attempts</option>
            </select>
          </label>
          <div className="col-span-1">
            <Button type="submit" loading={query.isFetching} className="w-full">
              <Search size={14} /> Search
            </Button>
          </div>
        </form>
      </Card>

      {query.error && <ErrorBanner message={(query.error as Error).message} />}

      {query.data && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
                Attendance · Immutable Log
              </div>
              <div className="text-sm font-medium mt-0.5">
                {query.data.employeeNo
                  ? `Employee ${query.data.employeeNo}`
                  : 'All employees'}{' '}
                · {query.data.startDate} → {query.data.endDate}
              </div>
            </div>
            <Pill tone="green">{query.data.count} records</Pill>
          </div>

          {query.data.records.length === 0 ? (
            <div className="p-10 text-center text-ink-500 text-sm">
              No attendance events in this range.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink-100/40 text-ink-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Timestamp</th>
                  <th className="text-left px-3 py-2.5 font-medium">Employee</th>
                  <th className="text-left px-3 py-2.5 font-medium">Door</th>
                  <th className="text-left px-3 py-2.5 font-medium">Reader</th>
                  <th className="text-left px-3 py-2.5 font-medium">Verify</th>
                  <th className="text-left px-3 py-2.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {query.data.records.map((r, i) => (
                  <tr key={i} className="border-t border-ink-100 row-hover">
                    <td className="px-5 py-3 font-mono text-xs text-ink-700">
                      {r.time}
                    </td>
                    <td className="px-3 py-3 font-medium">REF-{r.employeeNo}</td>
                    <td className="px-3 py-3">{r.doorNo ?? '—'}</td>
                    <td className="px-3 py-3">{r.cardReaderNo ?? '—'}</td>
                    <td className="px-3 py-3 text-ink-500">
                      {r.verifyMode ?? minorLabel(r.minor)}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={r.granted ? 'green' : 'red'}>
                        {r.granted ? 'Granted' : 'Denied'}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}

function minorLabel(minor: number): string {
  switch (minor) {
    case 1:
      return 'Card';
    case 38:
      return 'Fingerprint';
    case 75:
      return 'Face';
    case 76:
      return 'Face + FP';
    case 77:
      return 'Card + FP';
    case 78:
      return 'Card + Face';
    case 113:
      return 'QR Code';
    default:
      return `Minor ${minor}`;
  }
}
