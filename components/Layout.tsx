import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // --- PRESENCE BROADCAST ---
  // Informa aos outros usuários que este usuário está online.
  useEffect(() => {
    if (!user) return;

    // Canal único global para presença
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id, // Chave única do usuário
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Envia estado inicial
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          name: user.name
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Busca global..." 
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>
            
            <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Main Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;