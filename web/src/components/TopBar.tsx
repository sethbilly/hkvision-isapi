import { useEffect, useState } from 'react';
import { Bell, Plus, Wifi, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDeviceContext } from '../context/DeviceContext';

const titles: Record<string, [string, string]> = {
  '/devices': ['Governance', 'HikVision Manager'],
  '/users': ['Admin', 'User Management'],
  '/enroll': ['Admin', 'Fingerprint Enrollment'],
  '/attendance': ['Admin', 'Attendance Records'],
};

export function TopBar() {
  const { pathname } = useLocation();
  const { devices, selected, setSelectedId } = useDeviceContext();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [section, page] = titles[pathname] ?? ['', ''];
  const time = now.toUTCString().split(' ')[4] + ' GMT';

  return (
    <header className="h-12 bg-canvas border-b border-ink-100 flex items-center justify-between px-5 text-[13px]">
      {/* Left: breadcrumb + status pill */}
      <div className="flex items-center gap-3">
        <div className="text-ink-500">
          {section} <span className="mx-1.5 text-ink-200">·</span>
          <span className="text-ink-900 font-medium">{page}</span>
        </div>
        <div className="pill bg-brand-green/10 text-brand-greenDark">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block" />
          LIVE · 248 IN · 12 LATE · 3 ON LEAVE
        </div>
      </div>

      {/* Right: device picker + sync + clock + bell + new */}
      <div className="flex items-center gap-3">
        {devices.length > 0 && (
          <select
            value={selected?.id ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-paper border border-ink-200 rounded-md px-2 py-1 text-xs"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.serial ? `· ${d.serial}` : ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1.5 text-ink-500 text-xs">
          <Wifi size={14} className="text-brand-green" /> Online · Synced
        </div>
        <div className="flex items-center gap-1.5 text-ink-500 text-xs">
          <Clock size={14} /> {time}
        </div>
        <button className="p-1.5 rounded-full hover:bg-ink-100">
          <Bell size={16} className="text-ink-500" />
        </button>
        <button className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-greenDark text-white text-xs font-medium px-3 py-1.5 rounded-md">
          <Plus size={14} /> New Action
        </button>
      </div>
    </header>
  );
}
