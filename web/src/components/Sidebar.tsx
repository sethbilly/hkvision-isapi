import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Fingerprint,
  CalendarCheck2,
  ListChecks,
  CalendarDays,
  ShieldCheck,
  Wallet,
  HardDrive,
  Users,
  CalendarRange,
  Search,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ComponentType<any>;
  disabled?: boolean;
}

const operations: NavItemDef[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: true },
  { to: '/kiosk', label: 'Biometric Kiosk', icon: Fingerprint, disabled: true },
  { to: '/attendance-profile', label: 'Attendance Profile', icon: CalendarCheck2, disabled: true },
  { to: '/roster', label: 'Roster Architect', icon: ListChecks, disabled: true },
  { to: '/leave', label: 'Leave Workflow', icon: CalendarDays, disabled: true },
];

const governance: NavItemDef[] = [
  { to: '/integrity', label: 'Integrity Vault', icon: ShieldCheck, disabled: true },
  { to: '/payroll', label: 'Payroll Hub', icon: Wallet, disabled: true },
  { to: '/devices', label: 'HikVision Manager', icon: HardDrive },
];

const admin: NavItemDef[] = [
  { to: '/users', label: 'User Management', icon: Users },
  { to: '/enroll', label: 'Fingerprint Enroll', icon: Fingerprint },
  { to: '/fingerprints', label: 'Fingerprint Registry', icon: Fingerprint },
  { to: '/attendance', label: 'Attendance Records', icon: CalendarRange },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mt-5 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
      {children}
    </div>
  );
}

function NavItem({ item }: { item: NavItemDef }) {
  const Icon = item.icon;
  if (item.disabled) {
    return (
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-ink-400/70 cursor-not-allowed select-none"
        title="Coming soon"
      >
        <Icon size={16} />
        <span className="truncate">{item.label}</span>
      </div>
    );
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
          isActive
            ? 'bg-brand-red text-white shadow-sm'
            : 'text-ink-200 hover:text-white hover:bg-white/5',
        )
      }
    >
      <Icon size={16} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-ink-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-brand-red/90 grid place-items-center font-serif italic text-lg">
            R
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Energy Ltd</div>
            <div className="text-[10px] text-ink-400 uppercase tracking-[0.18em]">
              Attendance Management
            </div>
          </div>
        </div>
        <div className="mt-4 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            placeholder="Search a person…"
            className="w-full bg-white/5 border border-white/10 rounded-md pl-7 pr-2 py-1.5 text-xs placeholder:text-ink-400 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <SectionHeader>Operations</SectionHeader>
        <div className="space-y-0.5">
          {operations.map((i) => <NavItem key={i.to} item={i} />)}
        </div>

        <SectionHeader>Governance</SectionHeader>
        <div className="space-y-0.5">
          {governance.map((i) => <NavItem key={i.to} item={i} />)}
        </div>

        <SectionHeader>Admin</SectionHeader>
        <div className="space-y-0.5">
          {admin.map((i) => <NavItem key={i.to} item={i} />)}
        </div>
      </nav>

      {/* Footer: system health + user */}
      <div className="border-t border-white/5 p-3 space-y-3">
        <div className="bg-white/5 rounded-md p-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber inline-block" />
            System Health
          </div>
          <div className="text-[10px] text-ink-400 mt-1 leading-tight">
            All biometric data synced. Last heartbeat 4s ago.
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[78%] bg-gradient-to-r from-brand-red via-brand-amber to-brand-green" />
          </div>
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-brand-red/80 grid place-items-center text-[11px] font-semibold">
            AD
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-semibold">Angela Ama Dankwa</div>
            <div className="text-ink-400">Director, HR &amp; Admin</div>
          </div>
        </div>
        <button className="w-full flex items-center gap-2 text-[12px] text-ink-200 hover:text-white px-1 py-1">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
