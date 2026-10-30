import React, { useState } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { IndustrialSearch } from './pages/IndustrialSearch';
import { Leads } from './pages/Leads';
import { Import } from './pages/Import';
import { Campaigns } from './pages/Campaigns';
import { Inbox } from './pages/Inbox';
import { Knowledge } from './pages/Knowledge';
import { TestLab } from './pages/TestLab';
import { Integrations } from './pages/Integrations';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Global Header */}
        <Header currentTab={currentTab} />

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && <Dashboard onNavigate={(t) => setCurrentTab(t as NavTab)} />}
          {currentTab === 'search' && <IndustrialSearch />}
          {currentTab === 'leads' && <Leads />}
          {currentTab === 'import' && <Import />}
          {currentTab === 'campaigns' && <Campaigns />}
          {currentTab === 'inbox' && <Inbox />}
          {currentTab === 'knowledge' && <Knowledge />}
          {currentTab === 'test-lab' && <TestLab />}
          {currentTab === 'integrations' && <Integrations />}
          {currentTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};

export default App;
