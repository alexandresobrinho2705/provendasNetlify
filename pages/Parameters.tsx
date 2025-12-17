import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { SystemParameters } from '../types';
import { 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  Truck, 
  Briefcase, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  AlertTriangle
} from 'lucide-react';

type ParamKey = 'freight_types' | 'segment_types' | 'payment_terms';

const Parameters: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Estado Local dos Dados
  const [params, setParams] = useState<SystemParameters>({
    freight_types: ['CIF', 'FOB'],
    segment_types: [],
    payment_terms: ['À Vista', '30 Dias']
  });

  // Estado para Modal de Edição/Adição
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ParamKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Estado para Confirmação de Exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{type: ParamKey, index: number} | null>(null);

  useEffect(() => {
    if (user) {
      loadParameters();
    }
  }, [user]);

  const loadParameters = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle(); 

      if (error) throw error;

      if (data) {
        setParams(data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar parâmetros:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDB = async (newParams: SystemParameters) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('system_parameters')
        .upsert({
          owner_id: user?.id,
          freight_types: newParams.freight_types,
          segment_types: newParams.segment_types,
          payment_terms: newParams.payment_terms,
          updated_at: new Date()
        }, { onConflict: 'owner_id' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Alterações salvas com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // --- CRUD Logic ---

  const handleOpenAdd = (type: ParamKey) => {
    setModalType(type);
    setEditingIndex(null);
    setInputValue('');
    setModalOpen(true);
  };

  const handleOpenEdit = (type: ParamKey, index: number, value: string) => {
    setModalType(type);
    setEditingIndex(index);
    setInputValue(value);
    setModalOpen(true);
  };

  const handleConfirmSaveItem = async () => {
    if (!modalType || !inputValue.trim()) return;

    const newList = [...(params[modalType] || [])];
    
    if (editingIndex !== null) {
      // Editando
      newList[editingIndex] = inputValue.trim();
    } else {
      // Adicionando
      newList.push(inputValue.trim());
    }

    const newParams = { ...params, [modalType]: newList };
    setParams(newParams);
    setModalOpen(false);
    
    // Salva automaticamente no banco
    await handleSaveToDB(newParams);
  };

  const handleDeleteRequest = (type: ParamKey, index: number) => {
    setDeleteConfirm({ type, index });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { type, index } = deleteConfirm;
    const newList = (params[type] as string[]).filter((_, i) => i !== index);
    const newParams = { ...params, [type]: newList };
    
    setParams(newParams);
    setDeleteConfirm(null);
    
    await handleSaveToDB(newParams);
  };

  // --- Render Helpers ---

  const renderSection = (
    title: string, 
    icon: React.ReactNode, 
    dataKey: ParamKey, 
    colorClass: string,
    placeholder: string
  ) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            {icon}
          </div>
          <h3 className="font-bold text-slate-800">{title}</h3>
        </div>
        <button 
          onClick={() => handleOpenAdd(dataKey)}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Adicionar Novo"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 max-h-[300px]">
        {(!params[dataKey] || params[dataKey].length === 0) && (
          <p className="text-sm text-slate-400 italic text-center py-4">Nenhum item cadastrado.</p>
        )}
        {params[dataKey]?.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-indigo-200 transition-colors">
              <span className="text-sm text-slate-700 font-medium">{item}</span>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenEdit(dataKey, idx, item)} 
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteRequest(dataKey, idx)} 
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Parâmetros do Sistema</h2>
          <p className="text-slate-500">Gerencie as listas auxiliares para cadastros e pedidos.</p>
        </div>
        {/* Status indicator global */}
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            <Loader2 size={14} className="animate-spin" /> Salvando...
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        
        {/* Tipos de Segmento */}
        {renderSection(
          "Segmentos de Clientes", 
          <Briefcase size={20} />, 
          "segment_types", 
          "bg-emerald-50 text-emerald-600",
          "Ex: Varejo, Indústria..."
        )}

        {/* Tipos de Frete */}
        {renderSection(
          "Tipos de Frete", 
          <Truck size={20} />, 
          "freight_types", 
          "bg-blue-50 text-blue-600",
          "Ex: CIF, FOB..."
        )}

        {/* Condições de Pagamento */}
        {renderSection(
          "Condições de Pagamento", 
          <CreditCard size={20} />, 
          "payment_terms", 
          "bg-orange-50 text-orange-600",
          "Ex: 30/60 Dias..."
        )}
      </div>

      {/* --- MODAL DE ADICIONAR / EDITAR --- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800">
                 {editingIndex !== null ? 'Editar Item' : 'Adicionar Novo Item'}
               </h3>
               <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <div className="mb-6">
               <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
               <input 
                 type="text" 
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="Digite o nome..."
                 autoFocus
                 onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveItem()}
               />
             </div>

             <div className="flex justify-end gap-3">
               <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
               <button onClick={handleConfirmSaveItem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">Salvar</button>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                   <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir Item?</h3>
                <p className="text-sm text-slate-500 mb-6">
                   Você tem certeza que deseja remover este item da lista? Isso não afetará registros passados que já usam este nome.
                </p>
                <div className="flex gap-3 w-full">
                   <button 
                     onClick={() => setDeleteConfirm(null)}
                     className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleConfirmDelete}
                     className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors"
                   >
                     Excluir
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Parameters;