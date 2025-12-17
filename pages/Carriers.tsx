import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Carrier } from '../types';
import { 
  Truck, 
  Search, 
  Plus, 
  Loader2, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Database,
  Smartphone,
  FileText,
  User
} from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';

// Helper Component defined outside to avoid re-creation on render and fix type issues
const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 mt-6 first:mt-0">
    {children}
  </h3>
);

const Carriers: React.FC = () => {
  const { user } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewCarrier, setViewCarrier] = useState<Carrier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);

  // Form State
  const initialFormState: Carrier = {
    id: '',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    cellphone: '',
    contact_name: ''
  };

  const [formData, setFormData] = useState<Carrier>(initialFormState);

  useEffect(() => {
    if (user) fetchCarriers();
  }, [user]);

  const fetchCarriers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('carriers')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      if (data) setCarriers(data);
    } catch (error: any) {
      console.error('Erro ao buscar transportadoras:', error);
      
      let errorMsg = 'Erro desconhecido ao carregar transportadoras.';
      
      if (error?.code === '42P01') {
        errorMsg = 'A tabela "carriers" não foi encontrada. Clique no botão de Banco de Dados (topo direito) e execute o script SQL.';
      } else if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }

      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers Auxiliares ---

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    }).catch(() => {
        setMessage({ type: 'error', text: 'Erro ao copiar SQL para a área de transferência.' });
    });
  };

  const masks = {
    cnpj: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').substring(0, 18),
    phone: (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15),
    cep: (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9),
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cnpj') finalValue = masks.cnpj(value);
    if (name === 'phone' || name === 'cellphone') finalValue = masks.phone(value);
    if (name === 'cep') finalValue = masks.cep(value);

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro CEP", error);
      }
    }
  };

  // --- CRUD Actions ---

  const handleOpenModal = (carrier?: Carrier) => {
    setMessage(null);
    if (carrier) {
      setFormData(carrier);
    } else {
      setFormData({ ...initialFormState });
    }
    setViewCarrier(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = { ...formData, owner_id: user?.id };
      if (!payload.id) delete (payload as any).id;

      const { data, error } = await supabase
        .from('carriers')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Transportadora salva com sucesso!' });
      
      if (formData.id) {
        setCarriers(prev => prev.map(c => c.id === formData.id ? (data as Carrier) : c));
      } else {
        setCarriers(prev => [...prev, (data as Carrier)]);
      }

      setTimeout(() => {
        setIsSaving(false);
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);

    } catch (error: any) {
      let errorMsg = error.message || 'Erro desconhecido ao salvar.';
      if (error.code === '42P01') errorMsg = 'Tabela "carriers" não encontrada. Execute o SQL.';
      setMessage({ type: 'error', text: errorMsg });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('carriers').delete().eq('id', deleteConfirm);
      if (error) throw error;
      setCarriers(prev => prev.filter(c => c.id !== deleteConfirm));
      setDeleteConfirm(null);
      if (viewCarrier?.id === deleteConfirm) setViewCarrier(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao excluir: ' + (error.message || 'Erro desconhecido') });
      setDeleteConfirm(null);
    }
  };

  // --- RENDER ---

  const filtered = carriers.filter(c => 
    c.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transportadoras</h2>
          <p className="text-slate-500 mt-1">Gerencie os parceiros logísticos para frete</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleCopySql}
             className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
             title="Copiar Script SQL"
           >
             {showSqlSuccess ? <CheckCircle2 size={20} className="text-green-400" /> : <Database size={20} />}
           </button>
           <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
           >
             <Plus size={20} />
             Nova Transportadora
           </button>
        </div>
      </div>

      {/* Mensagem de Erro Global */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0"/> : <AlertCircle size={18} className="mt-0.5 shrink-0"/>}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por Razão Social, Fantasia ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" /></div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-medium tracking-wider border-b border-slate-200">
                     <tr>
                        <th className="px-6 py-4">Transportadora</th>
                        <th className="px-6 py-4">Localização</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                     {filtered.length === 0 && !isLoading && <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>}
                     {filtered.map(carrier => (
                        <tr key={carrier.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                    <Truck size={20} className="text-orange-500" />
                                 </div>
                                 <div>
                                    <div className="font-semibold text-slate-900">{carrier.nome_fantasia}</div>
                                    <div className="text-xs text-slate-500">{carrier.razao_social}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                              <div className="flex items-center gap-1">
                                 <MapPin size={14} className="text-slate-400" />
                                 {carrier.city} - {carrier.state}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                              <div className="flex flex-col">
                                 <span className="flex items-center gap-1"><Phone size={12}/> {carrier.phone || carrier.cellphone}</span>
                                 {carrier.contact_name && <span className="text-xs text-slate-400">Ref: {carrier.contact_name}</span>}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => setViewCarrier(carrier)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={18} /></button>
                                 <button onClick={() => handleOpenModal(carrier)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                 <button onClick={() => setDeleteConfirm(carrier.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {/* --- MODAL FORMULARIO --- */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Editar Transportadora' : 'Nova Transportadora'}</h2>
                  <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               
               <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                  {message && message.type === 'error' && !message.text.includes('Tabela') && (
                     <div className="mb-6 p-4 rounded-lg flex items-start gap-3 text-sm bg-red-50 text-red-700">
                        <AlertCircle size={18} className="mt-0.5"/>
                        <span>{message.text}</span>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Dados Principais */}
                     <div className="md:col-span-2">
                        <SectionTitle>Dados da Empresa</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                                <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                                <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                                <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="00.000.000/0000-00" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                                <input type="text" name="ie" value={formData.ie} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                     </div>

                     {/* Contatos */}
                     <div className="md:col-span-2">
                        <SectionTitle>Contato</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Contato</label>
                                <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Fixo</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                                <input type="text" name="cellphone" value={formData.cellphone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                     </div>

                     {/* Endereço */}
                     <div className="md:col-span-2">
                        <SectionTitle>Endereço</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                                <input type="text" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="00000-000" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                                <input type="text" name="number" value={formData.number} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                                <input type="text" name="complement" value={formData.complement} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="sm:col-span-3 flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                                    <input type="text" name="city" value={formData.city} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none" />
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                                    <input type="text" name="state" value={formData.state} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none" />
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
               </form>

               <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                  <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                     {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- MODAL VISUALIZAÇÃO --- */}
      {viewCarrier && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewCarrier(null)}></div>
            <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               
               {/* Header Visual */}
               <div className="relative bg-gradient-to-r from-orange-600 to-red-600 text-white p-8">
                  <button onClick={() => setViewCarrier(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"><X size={20}/></button>
                  
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 flex items-center justify-center shrink-0">
                        <Truck className="text-white" size={40} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-bold">{viewCarrier.nome_fantasia}</h2>
                        <p className="text-orange-100 text-sm font-medium mt-1">{viewCarrier.razao_social}</p>
                     </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
                  
                  {/* Cards de Topo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Dados Fiscais</h4>
                          <div className="space-y-2">
                              <div>
                                  <span className="text-xs text-slate-500 block">CNPJ</span>
                                  <span className="font-medium text-slate-900">{viewCarrier.cnpj}</span>
                              </div>
                              <div>
                                  <span className="text-xs text-slate-500 block">Inscrição Estadual</span>
                                  <span className="font-medium text-slate-900">{viewCarrier.ie || 'Isento'}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><User size={14}/> Contato Principal</h4>
                          <div className="space-y-2">
                              <div>
                                  <span className="text-xs text-slate-500 block">Nome</span>
                                  <span className="font-medium text-slate-900">{viewCarrier.contact_name || 'Não informado'}</span>
                              </div>
                              <div>
                                  <span className="text-xs text-slate-500 block">Email</span>
                                  {viewCarrier.email ? (
                                    <a href={`mailto:${viewCarrier.email}`} className="text-indigo-600 hover:underline">{viewCarrier.email}</a>
                                  ) : '-'}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Telefones */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                       <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Smartphone size={14}/> Telefones</h4>
                       <div className="grid grid-cols-2 gap-4">
                           {viewCarrier.phone && (
                               <div className="flex items-center gap-3">
                                   <div className="p-2 bg-slate-100 rounded-lg"><Phone size={18} className="text-slate-600"/></div>
                                   <div>
                                       <span className="text-xs text-slate-500 block">Fixo</span>
                                       <span className="font-medium text-slate-900">{viewCarrier.phone}</span>
                                   </div>
                               </div>
                           )}
                           {viewCarrier.cellphone && (
                               <div className="flex items-center gap-3">
                                   <div className="p-2 bg-green-50 rounded-lg"><Smartphone size={18} className="text-green-600"/></div>
                                   <div>
                                       <span className="text-xs text-slate-500 block">Celular / Whats</span>
                                       <a href={`https://wa.me/55${viewCarrier.cellphone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-green-600">{viewCarrier.cellphone}</a>
                                   </div>
                               </div>
                           )}
                           {!viewCarrier.phone && !viewCarrier.cellphone && <span className="text-slate-400 italic text-sm">Nenhum telefone cadastrado.</span>}
                       </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><MapPin size={14}/> Localização</h4>
                      <div className="flex items-start gap-4">
                          <div className="p-3 bg-orange-50 rounded-xl text-orange-600 shrink-0"><MapPin size={24}/></div>
                          <div>
                              <p className="text-slate-900 font-medium text-lg">
                                  {viewCarrier.city} <span className="text-slate-400 mx-1">/</span> {viewCarrier.state}
                              </p>
                              <p className="text-slate-600 mt-1">
                                  {viewCarrier.address}, {viewCarrier.number}
                                  {viewCarrier.complement && ` - ${viewCarrier.complement}`}
                              </p>
                              <p className="text-slate-600">
                                  {viewCarrier.neighborhood}
                              </p>
                              <p className="text-slate-400 text-sm mt-2 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded">CEP: {viewCarrier.cep}</p>
                          </div>
                      </div>
                  </div>

               </div>
            </div>
         </div>
      )}

      {/* --- MODAL CONFIRMAÇÃO EXCLUSÃO --- */}
      {deleteConfirm && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
               <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24}/></div>
                  <h3 className="text-lg font-bold text-slate-900">Excluir Transportadora?</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">Esta ação removerá permanentemente o registro e não pode ser desfeita.</p>
                  <div className="flex gap-3">
                     <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
                     <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Excluir</button>
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Carriers;