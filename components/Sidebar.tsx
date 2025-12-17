import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package, 
  Factory, 
  Truck, 
  Settings, 
  Sliders, 
  UserCog, 
  X,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { NavItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Configuração de Menu agrupado
const navGroups: NavGroup[] = [
  {
    // Grupo Geral (Sem título ou "Principal")
    items: [
      { 
        label: 'Dashboard', 
        path: '/', 
        icon: LayoutDashboard,
        allowedRoles: ['Admin', 'Representante', 'Vendedor']
      },
      { 
        label: 'Orçamentos', 
        path: '/quotes', 
        icon: FileText,
        allowedRoles: ['Admin', 'Representante', 'Vendedor']
      },
      { 
        label: 'Pedidos', 
        path: '/orders', 
        icon: ShoppingCart,
        allowedRoles: ['Admin', 'Representante', 'Vendedor']
      },
      { 
        label: 'Comissões', 
        path: '/commissions', 
        icon: DollarSign,
        allowedRoles: ['Admin', 'Representante']
      },
    ]
  },
  {
    title: 'Cadastros',
    items: [
      { 
        label: 'Clientes', 
        path: '/customers', 
        icon: Users,
        allowedRoles: ['Admin', 'Representante', 'Vendedor']
      },
      { 
        label: 'Produtos', 
        path: '/products', 
        icon: Package,
        allowedRoles: ['Admin', 'Representante', 'Vendedor']
      },
      { 
        label: 'Indústrias', 
        path: '/industries', 
        icon: Factory,
        allowedRoles: ['Admin', 'Representante']
      },
      { 
        label: 'Transportadoras', 
        path: '/carriers', 
        icon: Truck,
        allowedRoles: ['Admin', 'Representante']
      },
    ]
  },
  {
    title: 'Configurações',
    items: [
      { 
        label: 'Minha Empresa', 
        path: '/settings', 
        icon: Settings,
        allowedRoles: ['Admin', 'Representante', 'Vendedor'] 
      },
      { 
        label: 'Parâmetros', 
        path: '/parameters', 
        icon: Sliders,
        allowedRoles: ['Admin']
      },
      { 
        label: 'Usuários', 
        path: '/users', 
        icon: UserCog,
        allowedRoles: ['Admin']
      },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Logic to check if user has access to a specific route
  const hasAccess = (item: NavItem) => {
    if (!user) return false;
    
    // 1. Admin tem acesso total sempre
    if (user.role === 'Admin') return true;

    // 2. Dashboard e Configurações Pessoais são sempre liberados
    if (item.path === '/' || item.path === '/settings') return true;

    // 3. Verifica se a rota está na lista de permitidos do usuário
    // Se o array allowed_routes existir, usa ele como fonte da verdade.
    if (user.allowed_routes && Array.isArray(user.allowed_routes)) {
        return user.allowed_routes.includes(item.path);
    }

    // 4. Fallback: Se não tiver allowed_routes definido (legado), usa as roles hardcoded (comportamento antigo)
    return item.allowedRoles.includes(user.role);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 z-30 h-full w-56 bg-slate-900 text-white transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-md">N</span>
              </div>
              <span>Nexus<span className="text-indigo-400">Sales</span></span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
            {navGroups.map((group, groupIndex) => {
              // Filtra os itens baseado na permissão dinâmica
              const groupFilteredItems = group.items.filter(item => hasAccess(item));

              if (groupFilteredItems.length === 0) return null;

              return (
                <div key={groupIndex} className="mb-6 last:mb-0">
                  {group.title && (
                    <h3 className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {group.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {groupFilteredItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                          className={`
                            flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
                            ${isActive 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }
                          `}
                        >
                          <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                          {/* TEXTO EM CAIXA ALTA */}
                          <span className="font-bold text-xs uppercase tracking-wide">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User / Logout Area */}
          <div className="p-4 border-t border-slate-700 bg-slate-900">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50">
              <img 
                src={user?.avatar || "https://picsum.photos/32/32"}
                alt="User" 
                className="w-8 h-8 rounded-full border border-slate-600 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Usuário'}</p>
                <p className="text-[10px] text-indigo-300 truncate font-semibold uppercase">{user?.role}</p>
              </div>
              <button 
                onClick={handleLogoutClick}
                className="text-slate-400 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
             <div className="text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <LogOut size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Sair do Sistema?</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                   Você tem certeza que deseja sair?
                </p>
                <div className="flex gap-3">
                   <button 
                     onClick={() => setShowLogoutConfirm(false)}
                     className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={confirmLogout}
                     className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
                   >
                     Sair
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;