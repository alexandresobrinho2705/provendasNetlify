import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Company } from '../types';
import { 
  Building2, 
  MapPin, 
  Upload, 
  Save, 
  Globe, 
  Mail, 
  Phone, 
  FileText,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  ShieldCheck
} from 'lucide-react';

const CompanySettings: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Verifica se é Admin para permitir edição
  const canEdit = user?.role === 'Admin';

  const [formData, setFormData] = useState<Company>({
    owner_id: '',
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    email: '',
    phone: '',
    website: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    admin_name: '',
    logo_url: ''
  });

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadCompanyData = async () => {
    setIsLoading(true);
    try {
      // Tenta buscar a empresa do owner_id. Se for um vendedor visualizando, precisaria de lógica diferente
      // (ex: buscar a empresa vinculada ao team_id). 
      // Por enquanto, assumimos que o owner_id está vinculado na tabela de usuarios ou todos veem a empresa "principal" do contexto.
      // Para simplificar no SaaS, vamos assumir que buscamos a empresa onde o usuário atual é owner OU
      // (num cenário real) buscaríamos a empresa pelo company_id do usuário.
      // Como o mock atual usa owner_id = user.id para criação, apenas o dono veria seus dados.
      // Ajuste: Busca a primeira empresa encontrada (simulação de Single Tenant per session ou user linkage)
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar empresa:', error);
      }

      if (data) {
        setFormData(data);
      } else {
         // Se não achou dados globais, tenta inicializar com dados do usuário se for Admin
         if (canEdit) {
            setFormData(prev => ({ ...prev, owner_id: user?.id || '', admin_name: user?.name || '' }));
         }
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMask = (e: React.ChangeEvent<HTMLInputElement>, maskType: 'cnpj' | 'cep' | 'phone') => {
    let value = e.target.value.replace(/\D/g, '');
    if (maskType === 'cnpj') {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else if (maskType === 'cep') {
      value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    } else if (maskType === 'phone') {
      value = value.replace(/^(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsLoading(true);
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
        console.error("Erro ao buscar CEP", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploadingLogo(true);
    setMessage(null);

    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      const publicUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, logo_url: publicUrlWithTimestamp }));
      setMessage({ type: 'success', text: 'Logo carregada! Salve para confirmar.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro no upload: ' + (error.message) });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('companies')
        .upsert({
            ...formData,
            owner_id: user?.id, // Garante owner atual se for novo
            updated_at: new Date()
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => {
        setIsEditModalOpen(false);
        setMessage(null);
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !formData.razao_social) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // --- RENDER: VIEW MODE (Perfil da Empresa) ---
  return (
    <div className="max-w-5xl mx-auto pb-10">
      
      {/* Header Visual */}
      <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        {/* Banner Decorativo */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-indigo-800"></div>
        
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-6 gap-6">
            {/* Logo Avatar */}
            <div className="relative w-32 h-32 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center overflow-hidden">
               {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="text-slate-300" size={48} />
              )}
            </div>
            
            {/* Infos Principais */}
            <div className="flex-1 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{formData.nome_fantasia || 'Nome da Empresa'}</h1>
              <p className="text-slate-500 font-medium">{formData.razao_social || 'Razão Social não informada'}</p>
            </div>

            {/* Botão de Ação (Apenas Admin) */}
            {canEdit && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="mb-2 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all"
              >
                <Edit2 size={18} />
                Editar Dados
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-slate-100">
             {/* Coluna 1: Contato */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Phone size={14} /> Contato
                </h3>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-slate-700">
                      <Mail size={18} className="text-indigo-500" />
                      <span>{formData.email || '-'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-700">
                      <Phone size={18} className="text-indigo-500" />
                      <span>{formData.phone || '-'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-700">
                      <Globe size={18} className="text-indigo-500" />
                      <a href={formData.website} target="_blank" rel="noreferrer" className="hover:underline text-indigo-600 truncate max-w-[200px]">
                        {formData.website || '-'}
                      </a>
                   </div>
                </div>
             </div>

             {/* Coluna 2: Fiscal */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} /> Dados Fiscais
                </h3>
                <div className="space-y-3">
                   <div className="flex flex-col">
                      <span className="text-xs text-slate-400">CNPJ</span>
                      <span className="font-medium text-slate-800">{formData.cnpj || '-'}</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Inscrição Estadual</span>
                      <span className="font-medium text-slate-800">{formData.ie || 'Isento'}</span>
                   </div>
                   <div className="flex items-center gap-2 mt-2">
                      <ShieldCheck size={16} className="text-green-500" />
                      <span className="text-sm text-slate-600">Admin: <strong>{formData.admin_name}</strong></span>
                   </div>
                </div>
             </div>

             {/* Coluna 3: Endereço */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} /> Localização
                </h3>
                <div className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                   {formData.address ? (
                     <>
                       {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}<br />
                       {formData.neighborhood}<br />
                       {formData.city} - {formData.state}<br />
                       CEP: {formData.cep}
                     </>
                   ) : (
                     <span className="text-slate-400 italic">Endereço não cadastrado</span>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- MODAL DE EDIÇÃO (OVERLAY) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <div>
                  <h2 className="text-lg font-bold text-slate-800">Editar Dados da Empresa</h2>
                  <p className="text-sm text-slate-500">Atualize as informações corporativas.</p>
               </div>
               <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
               >
                 <X size={24} />
               </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
               
               {message && (
                  <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                    <span>{message.text}</span>
                  </div>
                )}

               <form id="company-form" onSubmit={handleSave} className="space-y-6">
                  
                  {/* Seção Logo */}
                  <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="text-slate-300" size={32} />
                        )}
                        {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Alterar Logo</label>
                        <input type="file" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                      <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                      <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                      <input type="text" name="cnpj" value={formData.cnpj} onChange={(e) => handleMask(e, 'cnpj')} maxLength={18} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                      <input type="text" name="ie" value={formData.ie} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Admin Responsável</label>
                      <input type="text" name="admin_name" value={formData.admin_name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                      <input type="text" name="phone" value={formData.phone} onChange={(e) => handleMask(e, 'phone')} maxLength={15} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                      <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                        <input type="text" name="cep" value={formData.cep} onChange={(e) => handleMask(e, 'cep')} onBlur={handleCepBlur} maxLength={9} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                        <input type="text" name="number" value={formData.number} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                        <input type="text" name="complement" value={formData.complement} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                        <input type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                        <input type="text" name="city" value={formData.city} readOnly className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 outline-none" />
                      </div>
                    </div>
                  </div>
               </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                type="button"
              >
                Cancelar
              </button>
              <button 
                form="company-form"
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm disabled:opacity-70"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySettings;