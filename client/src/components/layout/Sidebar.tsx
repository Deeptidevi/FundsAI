import React from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  UploadCloud,
  Send,
  MessageSquare,
  BookOpen,
  FlaskConical,
  Puzzle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'search'
  | 'leads'
  | 'import'
  | 'campaigns'
  | 'inbox'
  | 'knowledge'
  | 'test-lab'
  | 'integrations'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingApprovalsCount?: number;
  unreadInboxCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  pendingApprovalsCount = 0,
  unreadInboxCount = 0,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number; isTestLab?: boolean }> = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'search', label: 'Industrial Search', icon: <Search size={20} /> },
    { id: 'leads', label: 'Leads Directory', icon: <Users size={20} /> },
    { id: 'import', label: 'Import Excel / CSV', icon: <UploadCloud size={20} /> },
    {
      id: 'campaigns',
      label: 'Campaigns',
      icon: <Send size={20} />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'inbox',
      label: 'Unified Inbox',
      icon: <MessageSquare size={20} />,
      badge: unreadInboxCount > 0 ? unreadInboxCount : undefined,
    },
    { id: 'knowledge', label: 'Company Knowledge', icon: <BookOpen size={20} /> },
    { id: 'test-lab', label: 'Test Lab', icon: <FlaskConical size={20} />, isTestLab: true },
    { id: 'integrations', label: 'Integrations', icon: <Puzzle size={20} /> },
    { id: 'settings', label: 'Settings & Security', icon: <Settings size={20} /> },
  ];

  return (
    <aside
      className={`h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-wide text-white leading-none">G-MAPS</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">Industrial AI</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              G
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative group ${
                  isActive
                    ? item.isTestLab
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className={isActive ? (item.isTestLab ? 'text-amber-400' : 'text-blue-400') : 'text-slate-400'}>
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {/* Badge */}
                {!collapsed && item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500 text-white leading-none">
                    {item.badge}
                  </span>
                )}

                {/* Test Lab Distinct Indicator */}
                {!collapsed && item.isTestLab && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Sandbox
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-medium rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80">
        <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 ${collapsed ? 'justify-center' : ''}`}>
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-xs font-medium text-slate-300 truncate">Human Approval Active</span>
              <span className="text-[10px] text-slate-500 truncate">Zero auto-sends without review</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
