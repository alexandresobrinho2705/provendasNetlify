import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save, 
  Loader2, 
  Mail, 
  Smartphone,
  Shield,
  Database,
  AlertTriangle,
  Share2,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, UserRole } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';
import { useAuth } from '../contexts/AuthContext';

// Definição das Permissões Disponíveis (Atualizado com Parâmetros)
const AVAILABLE_PERMISSIONS = [
    { id: '/customers', label: 'Clientes' },
    { id: '/products', label: 'Produtos' },
    { id: '/quotes', label: 'Orçamentos' },
    { id: '/orders', label: 'Pedidos' },
    { id: '/industries', label: 'Indústrias' },
    { id: '/carriers', label: 'Transportadoras' },
    { id: '/commissions', label: 'Comissões' },
    { id: '/parameters', label: 'Parâmetros do Sistema' },
];

const Users: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);

  // Form
  const initialForm: UserProfile = {
    id: '',
    full_name: '',
    email: '',
    cellphone: '',
    role: 'Vendedor',
    allowed_routes: ['/customers', '/products', '/quotes', '/orders']
  };
  const [formData, setFormData] = useState<UserProfile>(initialForm);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    subscribeToPresence();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name');
        
      if (error) throw error;
      if (data) setUsers(data as UserProfile[]);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      let msg = error.message;
      if (error.code === '42P01') msg = 'Tabela de perfis não encontrada. Execute o SQL.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel('online-users');
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = new Set<string>();
        for (const id in state) {
            const sessions = state[id] as any[];
            sessions.forEach(session => {
                if (session.user_id) onlineIds.add(session.user_id);
            });
        }
        setOnlineUserIds(onlineIds);
    }).subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    });
  };

  const handleShareInvite = (user: UserProfile) => {
      if (!user.cellphone) {
          alert('Este usuário não possui número de celular cadastrado.');
          return;
      }
      const cleanPhone = user.cellphone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
          alert('Número de celular inválido.');
          return;
      }
      const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      const origin = window.location.origin.replace(/\/$/, '');
      const inviteUrl = `${origin}/#/login`;
      const text = `Olá ${user.full_name}, cadastrei você no Nexus Sales.\n\nAcesse: ${inviteUrl}\n\n⚠️ IMPORTANTE: No primeiro acesso, clique na aba "Primeiro Acesso", digite seu email (${user.email}) e crie sua senha pessoal para ativar sua conta.`;
      const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const togglePermission = (path: string) => {
      setFormData(prev => {
          const currentRoutes = prev.allowed_routes || [];
          if (currentRoutes.includes(path)) {
              return { ...prev, allowed_routes: currentRoutes.filter(r => r !== path) };
          } else {
              return { ...prev, allowed_routes: [...currentRoutes, path] };
          }
      });
  };

  const handleOpenModal = (userToEdit?: UserProfile) => {
    setMessage(null);
    if (userToEdit) {
      setFormData({
          ...userToEdit,
          allowed_routes: userToEdit.allowed_routes || ['/customers', '/products', '/quotes', '/orders']
      });
    } else {
      setFormData({ ...initialForm });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Base payload with fields that can be edited
      const payload: any = { 
          full_name: formData.full_name,
          email: formData.email.trim().toLowerCase(),
          cellphone: formData.cellphone,
          role: formData.role,
          allowed_routes: formData.allowed_routes || [],
          updated_at: new Date().toISOString()
      };
      
      if (formData.id) {
        // UPDATE MODE
        const { error } = await supabase
          .from('user_profiles')
          .update(payload)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // INSERT MODE
        payload.owner_id = user?.id;
        
        const { error } = await supabase
          .from('user_profiles')
          .insert(payload);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: !formData.id ? 'Usuário pré-cadastrado! Envie o convite via WhatsApp.' : 'Usuário atualizado com sucesso!' });
      fetchUsers();
      
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
      }, 2500);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      // Tenta usar a RPC para exclusão completa (Perfil + Auth)
      const { error } = await supabase.rpc('delete_user_by_profile_id', { profile_id_input: deleteConfirm });
      
      if (error) {
          // Fallback se a RPC não existir ou falhar: deleta apenas o perfil
          console.warn("RPC falhou, tentando delete simples:", error);
          const { error: simpleError } = await supabase.from('user_profiles').delete().eq('id', deleteConfirm);
          if (simpleError) throw simpleError;
      }

      setUsers(prev => prev.filter(u => u.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuários</h2>
          <p className="text-slate-500 mt-1">Gerencie o acesso e permissões da equipe</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleCopySql}
             className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
             title="Copiar SQL Tabela Usuários"
           >
             {showSqlSuccess ? <CheckCircle2 size={20} className="text-green-400" /> : <Database size={20} />}
           </button>
           <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
           >
             <Plus size={20} />
             Novo Usuário
           </button>
        </div>
      </div>

      {message && message.type === 'error' && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle size={18} /> {message.text}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" /></div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-medium tracking-wider border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4 w-12 text-center">Status</th>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Função</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                     {filteredUsers.length === 0 && !isLoading && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>}
                     {filteredUsers.map(u => {
                        const isOnline = u.user_id ? onlineUserIds.has(u.user_id) : false;
                        return (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-4 text-center">
                                  <div className={`w-3 h-3 mx-auto rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`} title={isOnline ? 'Online agora' : 'Offline'}></div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{u.full_name}</div>
                                  <div className="text-xs text-slate-500">ID: {u.id.slice(0,8)}...</div>
                               </td>
                               <td className="px-6 py-4 text-slate-600">
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2"><Mail size={14}/> {u.email}</div>
                                      <div className="flex items-center gap-2"><Smartphone size={14}/> {u.cellphone || '-'}</div>
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide
                                    ${u.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                                  `}>
                                    {u.role === 'Admin' && <Shield size={10} />}
                                    {u.role}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                     <button onClick={() => handleShareInvite(u)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Enviar Convite por WhatsApp"><Share2 size={18} /></button>
                                     <button onClick={() => handleOpenModal(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                     <button onClick={() => setDeleteConfirm(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                  </div>
                               </td>
                            </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                   <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                   <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {message && message.type === 'success' && (
                        <div className="p-3 bg-green-50 text-green-700 rounded text-sm flex items-center gap-2"><CheckCircle2 size={16}/> {message.text}</div>
                    )}
                    
                    {!formData.id && !message && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-100 mb-2 flex gap-2">
                            <Mail size={16} className="shrink-0 mt-0.5" />
                            <div>
                                O usuário será vinculado à sua conta. <br/>
                                <span className="font-bold">Use o botão de WhatsApp (ícone verde) após salvar para enviar o link de ativação.</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                        <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular / Whatsapp</label>
                            <input type="text" value={formData.cellphone} onChange={e => setFormData({...formData, cellphone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="(00) 00000-0000" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função (Cargo)</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                <option value="Vendedor">Vendedor</option>
                                <option value="Representante">Representante</option>
                                <option value="Admin">Administrador</option>
                            </select>
                        </div>
                    </div>

                    {formData.role !== 'Admin' && (
                        <div className="pt-2 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Permissões de Acesso (Menu)</label>
                            <div className="grid grid-cols-2 gap-3">
                                {AVAILABLE_PERMISSIONS.map(perm => {
                                    const isChecked = formData.allowed_routes?.includes(perm.id);
                                    return (
                                        <label key={perm.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-200'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={() => togglePermission(perm.id)}
                                                className="hidden"
                                            />
                                            {isChecked ? <CheckSquare size={18} className="text-indigo-600 shrink-0" /> : <Square size={18} className="text-slate-400 shrink-0" />}
                                            <span className="text-sm font-medium">{perm.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 italic">* O Dashboard e Configurações de Perfil são visíveis para todos.</p>
                        </div>
                    )}
                    {formData.role === 'Admin' && (
                        <div className="p-3 bg-purple-50 text-purple-700 text-sm rounded-lg flex items-center gap-2 border border-purple-100">
                            <Shield size={16} /> Administradores possuem acesso total ao sistema.
                        </div>
                    )}

                </form>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button type="submit" onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                    </button>
                </div>
            </div>
         </div>
      )}

      {deleteConfirm && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
               <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24}/></div>
                  <h3 className="text-lg font-bold text-slate-900">Excluir Usuário?</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">Esta ação removerá o perfil e o acesso de login do sistema.</p>
                  <div className="flex gap-3">
                     <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
                     <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                        {isDeleting ? <Loader2 className="animate-spin" size={16}/> : 'Excluir'}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Users;