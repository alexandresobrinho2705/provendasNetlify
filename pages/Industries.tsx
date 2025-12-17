import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Industry } from '../types';
import { 
  Factory, 
  Search, 
  Plus, 
  Loader2, 
  Edit, 
  Trash2, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  DollarSign, 
  UserCheck, 
  Building2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Database,
  FileText,
  Smartphone,
  Briefcase,
  CreditCard,
  QrCode
} from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';

// Helper Components defined outside to avoid re-creation on render and fix type issues
const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 mt-6 first:mt-0">
    {children}
  </h3>
);

const DetailItem = ({ label, value, icon: Icon, fullWidth = false }: { label: string, value?: string | number, icon?: any, fullWidth?: boolean }) => {
  if (!value) return null;
  return (
      <div className={`${fullWidth ? 'col-span-full' : ''}`}>
          <span className="text-xs text-slate-500 mb-1 block">{label}</span>
          <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
              {Icon && <Icon size={14} className="text-slate-400" />}
              {value}
          </div>
      </div>
  );
};

const ContactCard = ({ role, name, email, cell, colorClass, icon: Icon }: any) => {
  if (!name && !email && !cell) return null;
  return (
      <div className={`p-4 rounded-xl border bg-white ${colorClass} h-full`}>
          <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg bg-current bg-opacity-10`}>
                  <Icon size={18} className="text-current" />
              </div>
              <span className="font-bold text-sm uppercase opacity-90">{role}</span>
          </div>
          
          <div className="space-y-2">
              {name && <div className="font-semibold text-slate-900">{name}</div>}
              
              <div className="space-y-1">
                  {email && (
                      <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors">
                          <Mail size={12} /> {email}
                      </a>
                  )}
                  {cell && (
                      <div className="flex items-center gap-2">
                           <a href={`tel:${cell.replace(/\D/g,'')}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors">
                              <Smartphone size={12} /> {cell}
                           </a>
                           <a href={`https://wa.me/55${cell.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700" title="Abrir WhatsApp">
                              <Smartphone size={12} />
                           </a>
                      </div>
                  )}
              </div>
          </div>
      </div>
  )
};

const Industries: React.FC = () => {
  const { user } = useAuth();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewIndustry, setViewIndustry] = useState<Industry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);

  // Form State
  const initialFormState: Industry = {
    id: '',
    cnpj: '',
    ie: '',
    razao_social: '',
    nome_fantasia: '',
    regime: '',
    icms: '',
    commission_rate: 0,
    phone: '',
    whatsapp: '',
    contact_name: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    comm_mgr_name: '', comm_mgr_email: '', comm_mgr_cell: '',
    fin_mgr_name: '', fin_mgr_email: '', fin_mgr_cell: '',
    director_name: '', director_email: '', director_cell: '',
    // Dados Bancários
    bank_name: '', bank_agency: '', bank_account: '', bank_holder: '',
    pix_key1: '', pix_key2: '', pix_key3: '',
    logo_url: ''
  };

  const [formData, setFormData] = useState<Industry>(initialFormState);

  useEffect(() => {
    if (user) fetchIndustries();
  }, [user]);

  const fetchIndustries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      if (data) setIndustries(data);
    } catch (error: any) {
      console.error('Erro ao buscar indústrias:', error);
      
      let errorMsg = error.message || 'Erro desconhecido';
      
      // Tratamento específico para erro de tabela inexistente (42P01)
      if (error.code === '42P01') {
        errorMsg = 'A tabela "industries" não foi encontrada. Por favor, execute o script SQL atualizado no Supabase.';
      } else if (typeof error === 'object' && error !== null) {
        // Tenta extrair mensagem se for um objeto genérico
        errorMsg = error.message || JSON.stringify(error);
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
    if (name.includes('phone') || name.includes('whatsapp') || name.includes('cell')) finalValue = masks.phone(value);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `industry_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploadingLogo(true);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro no upload: ' + (error.message || 'Erro desconhecido') });
    } finally {
      setUploadingLogo(false);
    }
  };

  // --- CRUD Actions ---

  const handleOpenModal = (ind?: Industry) => {
    setMessage(null);
    if (ind) {
      setFormData(ind);
    } else {
      setFormData({ ...initialFormState });
    }
    setViewIndustry(null);
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
        .from('industries')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Indústria salva com sucesso!' });
      
      if (formData.id) {
        setIndustries(prev => prev.map(i => i.id === formData.id ? (data as Industry) : i));
      } else {
        setIndustries(prev => [...prev, (data as Industry)]);
      }

      setTimeout(() => {
        setIsSaving(false);
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro: ' + (error.message || JSON.stringify(error)) });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('industries').delete().eq('id', deleteConfirm);
      if (error) throw error;
      setIndustries(prev => prev.filter(i => i.id !== deleteConfirm));
      setDeleteConfirm(null);
      if (viewIndustry?.id === deleteConfirm) setViewIndustry(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao excluir: ' + (error.message || JSON.stringify(error)) });
      setDeleteConfirm(null);
    }
  };

  // --- RENDER ---

  const filtered = industries.filter(i => 
    i.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.razao_social.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Indústrias</h2>
          <p className="text-slate-500 mt-1">Gerencie suas representadas e fornecedores</p>
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
             Nova Indústria
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
            placeholder="Buscar por Razão Social ou Nome Fantasia..." 
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
                        <th className="px-6 py-4">Indústria</th>
                        <th className="px-6 py-4">Cidade/UF</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Comissão</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                     {filtered.length === 0 && !isLoading && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum registro encontrado.</td></tr>}
                     {filtered.map(ind => (
                        <tr key={ind.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {ind.logo_url ? <img src={ind.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Factory size={20} className="text-indigo-400" />}
                                 </div>
                                 <div>
                                    <div className="font-semibold text-slate-900">{ind.nome_fantasia}</div>
                                    <div className="text-xs text-slate-500">{ind.razao_social}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-slate-600">{ind.city} - {ind.state}</td>
                           <td className="px-6 py-4 text-slate-600">
                              <div className="flex flex-col">
                                 <span>{ind.phone}</span>
                                 <span className="text-xs text-slate-400">{ind.contact_name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 font-medium text-xs border border-green-100">
                                 {ind.commission_rate}%
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => setViewIndustry(ind)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={18} /></button>
                                 <button onClick={() => handleOpenModal(ind)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                 <button onClick={() => setDeleteConfirm(ind.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {/* ... (rest of the modal code is same as original, just re-rendered for completeness or assumed unchanged unless SectionTitle is used) ... */}
      {/* Since I need to return FULL content, I include everything. */}

      {/* --- MODAL FORMULARIO --- */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-800">{formData.id ? 'Editar Indústria' : 'Nova Indústria'}</h2>
                  <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               
               <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                  {/* Mensagem interna do modal (caso haja erro ao salvar) */}
                  {message && message.type === 'error' && !message.text.includes('Tabela') && (
                     <div className="mb-6 p-4 rounded-lg flex items-start gap-3 text-sm bg-red-50 text-red-700">
                        <AlertCircle size={18} className="mt-0.5"/>
                        <span>{message.text}</span>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {/* Left Column: Logo & Main Info */}
                     <div className="md:col-span-1 space-y-6">
                        <div className="flex flex-col items-center">
                           <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative mb-3 group">
                              {formData.logo_url ? <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" /> : <Factory className="text-slate-300" size={40} />}
                              <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                 <Upload size={24} />
                                 <span className="text-xs font-medium mt-1">Alterar Logo</span>
                                 <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                              </label>
                              {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}
                           </div>
                           <p className="text-xs text-slate-400 text-center">Recomendado: 500x500px (PNG/JPG)</p>
                        </div>

                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                           <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="00.000.000/0000-00" required />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (%)</label>
                           <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input type="number" step="0.1" name="commission_rate" value={formData.commission_rate} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
                           </div>
                        </div>
                     </div>

                     {/* Right Column: Detailed Forms */}
                     <div className="md:col-span-2 space-y-6">
                        {/* Dados Gerais */}
                        <div>
                           <SectionTitle>Dados da Empresa</SectionTitle>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                                 <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                              </div>
                              <div className="sm:col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                                 <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                                 <input type="text" name="ie" value={formData.ie} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Regime Tributário</label>
                                 <select name="regime" value={formData.regime} onChange={(e) => setFormData({...formData, regime: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Selecione...</option>
                                    <option value="Simples Nacional">Simples Nacional</option>
                                    <option value="Lucro Presumido">Lucro Presumido</option>
                                    <option value="Lucro Real">Lucro Real</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">ICMS (%)</label>
                                 <input type="text" name="icms" value={formData.icms} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 18%" />
                              </div>
                           </div>
                        </div>

                        {/* Dados Bancários */}
                        <div>
                           <SectionTitle>Dados Bancários</SectionTitle>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
                                 <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome do Banco" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
                                 <input type="text" name="bank_agency" value={formData.bank_agency} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0000" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
                                 <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="00000-0" />
                              </div>
                              <div className="sm:col-span-3">
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Titular da Conta</label>
                                 <input type="text" name="bank_holder" value={formData.bank_holder} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nome do Titular" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Chave PIX 1</label>
                                 <input type="text" name="pix_key1" value={formData.pix_key1} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="CPF/CNPJ/Email..." />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Chave PIX 2</label>
                                 <input type="text" name="pix_key2" value={formData.pix_key2} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Chave Aleatória..." />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Chave PIX 3</label>
                                 <input type="text" name="pix_key3" value={formData.pix_key3} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Outra..." />
                              </div>
                           </div>
                        </div>

                        {/* Endereço */}
                        <div>
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

                        {/* Contatos Gerais */}
                        <div>
                           <SectionTitle>Contatos Gerais</SectionTitle>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome Contato</label>
                                 <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                                 <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Whatsapp</label>
                                 <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                           </div>
                        </div>

                        {/* Gestão */}
                        <div>
                           <SectionTitle>Diretoria e Gerência</SectionTitle>
                           
                           {/* Ger. Comercial */}
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Gerente Comercial</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                 <input type="text" name="comm_mgr_name" placeholder="Nome" value={formData.comm_mgr_name} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="email" name="comm_mgr_email" placeholder="Email" value={formData.comm_mgr_email} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="text" name="comm_mgr_cell" placeholder="Cel/Whats" value={formData.comm_mgr_cell} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                              </div>
                           </div>

                           {/* Ger. Financeiro */}
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Gerente Financeiro</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                 <input type="text" name="fin_mgr_name" placeholder="Nome" value={formData.fin_mgr_name} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="email" name="fin_mgr_email" placeholder="Email" value={formData.fin_mgr_email} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="text" name="fin_mgr_cell" placeholder="Cel/Whats" value={formData.fin_mgr_cell} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                              </div>
                           </div>

                           {/* Diretor */}
                           <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Diretor</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                 <input type="text" name="director_name" placeholder="Nome" value={formData.director_name} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="email" name="director_email" placeholder="Email" value={formData.director_email} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
                                 <input type="text" name="director_cell" placeholder="Cel/Whats" value={formData.director_cell} onChange={handleChange} className="px-3 py-2 border border-slate-200 rounded text-sm" />
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

      {/* --- MODAL VISUALIZAÇÃO MELHORADO --- */}
      {viewIndustry && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewIndustry(null)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               
               {/* Header: Logo, Nome e Resumo */}
               <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8">
                  <button onClick={() => setViewIndustry(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"><X size={20}/></button>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                     {/* Logo Box */}
                     <div className="w-28 h-28 bg-white rounded-xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden shrink-0">
                        {viewIndustry.logo_url ? <img src={viewIndustry.logo_url} className="w-full h-full object-contain p-2" /> : <Factory className="text-slate-400" size={48} />}
                     </div>
                     
                     <div className="text-center md:text-left flex-1">
                        <h2 className="text-3xl font-bold">{viewIndustry.nome_fantasia}</h2>
                        <p className="text-indigo-200 text-sm font-medium mt-1">{viewIndustry.razao_social}</p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm">
                           <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                              <MapPin size={14} className="text-indigo-300" />
                              <span>{viewIndustry.city}/{viewIndustry.state}</span>
                           </div>
                           <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
                              <FileText size={14} className="text-indigo-300" />
                              <span>CNPJ: {viewIndustry.cnpj}</span>
                           </div>
                        </div>
                     </div>

                     {/* Highlight de Comissão */}
                     <div className="hidden md:flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                        <span className="text-xs uppercase tracking-wider text-indigo-200 font-bold mb-1">Comissão</span>
                        <div className="text-3xl font-bold text-white">{viewIndustry.commission_rate}%</div>
                     </div>
                  </div>
               </div>
               
               {/* Body Content */}
               <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 space-y-8">
                  
                  {/* Grid 1: Informações Fiscais e Gerais */}
                  <div>
                    <SectionTitle>Informações Comerciais</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <DetailItem label="Inscrição Estadual" value={viewIndustry.ie || 'Isento'} icon={FileText} />
                         <DetailItem label="Regime Tributário" value={viewIndustry.regime} icon={Building2} />
                         <DetailItem label="ICMS Interno" value={viewIndustry.icms} icon={FileText} />
                         <div className="md:hidden">
                             <DetailItem label="Comissão" value={`${viewIndustry.commission_rate}%`} icon={DollarSign} />
                         </div>
                    </div>
                  </div>

                  {/* Grid 2: Dados Bancários (NOVO) */}
                  {(viewIndustry.bank_name || viewIndustry.pix_key1) && (
                      <div>
                        <SectionTitle>Dados Bancários</SectionTitle>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                           <div className="flex flex-col md:flex-row">
                              {/* Conta */}
                              <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-100">
                                 <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20}/></div>
                                    <h4 className="font-bold text-slate-800">Conta Corrente</h4>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Banco" value={viewIndustry.bank_name} />
                                    <DetailItem label="Agência" value={viewIndustry.bank_agency} />
                                    <DetailItem label="Conta" value={viewIndustry.bank_account} />
                                    <DetailItem label="Titular" value={viewIndustry.bank_holder} />
                                 </div>
                              </div>
                              
                              {/* PIX */}
                              <div className="flex-1 p-6 bg-slate-50/50">
                                 <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><QrCode size={20}/></div>
                                    <h4 className="font-bold text-slate-800">Chaves PIX</h4>
                                 </div>
                                 <div className="space-y-3">
                                    {viewIndustry.pix_key1 && (
                                       <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm">
                                          <span className="text-slate-600 font-mono">{viewIndustry.pix_key1}</span>
                                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Chave 1</span>
                                       </div>
                                    )}
                                    {viewIndustry.pix_key2 && (
                                       <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm">
                                          <span className="text-slate-600 font-mono">{viewIndustry.pix_key2}</span>
                                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Chave 2</span>
                                       </div>
                                    )}
                                    {viewIndustry.pix_key3 && (
                                       <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm">
                                          <span className="text-slate-600 font-mono">{viewIndustry.pix_key3}</span>
                                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Chave 3</span>
                                       </div>
                                    )}
                                    {!viewIndustry.pix_key1 && !viewIndustry.pix_key2 && !viewIndustry.pix_key3 && (
                                       <span className="text-sm text-slate-400 italic">Nenhuma chave cadastrada</span>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>
                      </div>
                  )}

                  {/* Grid 3: Localização e Contato Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Endereço */}
                      <div>
                          <SectionTitle>Localização</SectionTitle>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                              <div className="flex items-start gap-3">
                                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0"><MapPin size={20}/></div>
                                  <div>
                                      <p className="text-slate-900 font-medium">
                                          {viewIndustry.address}, {viewIndustry.number}
                                          {viewIndustry.complement && ` - ${viewIndustry.complement}`}
                                      </p>
                                      <p className="text-slate-600 text-sm mt-1">{viewIndustry.neighborhood}</p>
                                      <p className="text-slate-600 text-sm">{viewIndustry.city} - {viewIndustry.state}</p>
                                      <p className="text-slate-500 text-xs mt-2">CEP: {viewIndustry.cep}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Contato Principal */}
                      <div>
                          <SectionTitle>Contato Geral</SectionTitle>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                               <div className="space-y-4">
                                   <div className="flex items-center gap-3">
                                       <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0"><UserCheck size={20}/></div>
                                       <div>
                                            <span className="text-xs text-slate-400 block">Responsável</span>
                                            <span className="text-slate-900 font-medium">{viewIndustry.contact_name || 'Não informado'}</span>
                                       </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                       <div>
                                            <span className="text-xs text-slate-400 block mb-1">Telefone</span>
                                            {viewIndustry.phone ? (
                                                <a href={`tel:${viewIndustry.phone.replace(/\D/g,'')}`} className="text-sm text-slate-700 hover:text-indigo-600 font-medium flex items-center gap-1">
                                                    <Phone size={14}/> {viewIndustry.phone}
                                                </a>
                                            ) : <span className="text-sm text-slate-400">-</span>}
                                       </div>
                                       <div>
                                            <span className="text-xs text-slate-400 block mb-1">WhatsApp</span>
                                            {viewIndustry.whatsapp ? (
                                                <a href={`https://wa.me/55${viewIndustry.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                                                    <Smartphone size={14}/> {viewIndustry.whatsapp}
                                                </a>
                                            ) : <span className="text-sm text-slate-400">-</span>}
                                       </div>
                                   </div>
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* Grid 4: Equipe de Gestão */}
                  <div>
                      <SectionTitle>Equipe de Gestão</SectionTitle>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <ContactCard 
                             role="Comercial" 
                             name={viewIndustry.comm_mgr_name} 
                             email={viewIndustry.comm_mgr_email} 
                             cell={viewIndustry.comm_mgr_cell}
                             colorClass="border-indigo-100 text-indigo-700 bg-indigo-50/30"
                             icon={Briefcase}
                          />
                          <ContactCard 
                             role="Financeiro" 
                             name={viewIndustry.fin_mgr_name} 
                             email={viewIndustry.fin_mgr_email} 
                             cell={viewIndustry.fin_mgr_cell}
                             colorClass="border-emerald-100 text-emerald-700 bg-emerald-50/30"
                             icon={DollarSign}
                          />
                          <ContactCard 
                             role="Diretoria" 
                             name={viewIndustry.director_name} 
                             email={viewIndustry.director_email} 
                             cell={viewIndustry.director_cell}
                             colorClass="border-purple-100 text-purple-700 bg-purple-50/30"
                             icon={UserCheck}
                          />
                      </div>
                      
                      {/* Fallback se não tiver gestão cadastrada */}
                      {!viewIndustry.comm_mgr_name && !viewIndustry.fin_mgr_name && !viewIndustry.director_name && (
                          <div className="text-center py-6 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-xl">
                              Nenhum contato de gestão cadastrado.
                          </div>
                      )}
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
                  <h3 className="text-lg font-bold text-slate-900">Excluir Indústria?</h3>
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

export default Industries;