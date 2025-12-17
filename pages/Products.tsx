import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Package, 
  Tag, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Factory,
  Database,
  AlertTriangle,
  Barcode,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { Product, Industry } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';
import * as XLSX from 'xlsx';

const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');

  // Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importIndustryId, setImportIndustryId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);

  const initialFormState: Product = {
    id: '',
    cod: '',
    name: '',
    price: 0,
    ipi: 0,
    industry_id: ''
  };

  const [formData, setFormData] = useState<Product>(initialFormState);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar Indústrias para o Select
      const { data: industriesData } = await supabase
        .from('industries')
        .select('id, nome_fantasia')
        .order('nome_fantasia');
      
      if (industriesData) setIndustries(industriesData as Industry[]);

      // 2. Buscar Produtos com Join na Indústria
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          industry:industries(nome_fantasia)
        `)
        .order('name', { ascending: true });
        
      if (error) throw error;

      if (productsData) {
        setProducts(productsData as Product[]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      
      let errorMsg = 'Erro ao carregar dados.';
      if (error?.code === '42P01') {
         errorMsg = 'Tabela de produtos ou indústrias não encontrada. Atualize o Banco de Dados.';
      } else if (error?.message) {
         errorMsg = error.message;
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (product?: Product) => {
    setMessage(null);
    if (product) {
      setFormData(product);
    } else {
      setFormData({ ...initialFormState });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    // Validação simples
    if (!formData.industry_id) {
        setMessage({ type: 'error', text: 'Selecione uma indústria.' });
        setIsSaving(false);
        return;
    }

    try {
      const payload = { 
        ...formData, 
        owner_id: user?.id,
        price: parseFloat(formData.price.toString()),
        ipi: parseFloat(formData.ipi.toString())
      };
      
      delete (payload as any).industry;
      
      if (!payload.id) {
        delete (payload as any).id;
      }

      const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Produto salvo com sucesso!' });
      
      fetchData(); 

      setTimeout(() => {
        setIsSaving(false);
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + (error.message || 'Erro desconhecido') });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteConfirm);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao excluir: ' + error.message });
      setDeleteConfirm(null);
    }
  };

  // --- LÓGICA DE IMPORTAÇÃO ---

  const handleOpenImportModal = () => {
    setMessage(null);
    setImportIndustryId('');
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importIndustryId) {
      alert("Por favor, selecione uma indústria antes de importar.");
      return;
    }
    
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert("Selecione um arquivo Excel (.xls ou .xlsx).");
      return;
    }

    setIsImporting(true);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
            throw new Error("Arquivo vazio ou formato inválido.");
        }

        // Mapeamento Flexível
        const productsToInsert = data.map((row: any) => {
            // Normalizar chaves do objeto (remove espaços e poe lowercase)
            const normalizedRow: {[key: string]: any} = {};
            Object.keys(row).forEach(key => {
                normalizedRow[key.trim().toLowerCase()] = row[key];
            });

            // Funções de busca com variações
            const getField = (variations: string[]) => {
                for (const v of variations) {
                    if (normalizedRow[v] !== undefined) return normalizedRow[v];
                }
                return undefined;
            };

            const cod = getField(['cod', 'codigo', 'código', 'sku', 'ref', 'referencia', 'id']) || '';
            const name = getField(['name', 'nome', 'produto', 'descricao', 'descrição', 'item', 'product']) || '';
            
            // Tratamento de preço (pode vir como string "R$ 1.000,00" ou number)
            let priceVal = getField(['price', 'preco', 'preço', 'valor', 'valor unitario', 'vlr', 'custo', 'amount']) || 0;
            if (typeof priceVal === 'string') {
                // Remove caracteres não numéricos exceto virgula e ponto e traço
                priceVal = priceVal.replace(/[^\d,.-]/g, ''); 
                // Lógica simples para detectar se usa virgula como decimal
                if (priceVal.includes(',') && priceVal.includes('.')) {
                    // Ex: 1.250,50 -> remove ponto, troca virgula por ponto
                    priceVal = priceVal.replace(/\./g, '').replace(',', '.');
                } else if (priceVal.includes(',')) {
                    // Ex: 1250,50 -> troca virgula por ponto
                    priceVal = priceVal.replace(',', '.');
                }
            }

            let ipiVal = getField(['ipi', 'taxa', '%ipi', 'imposto']) || 0;
             if (typeof ipiVal === 'string') {
                 ipiVal = ipiVal.replace('%', '').replace(',', '.');
             }

            return {
                owner_id: user?.id,
                industry_id: importIndustryId,
                cod: String(cod),
                name: String(name),
                price: parseFloat(String(priceVal)) || 0,
                ipi: parseFloat(String(ipiVal)) || 0
            };
        }).filter(p => p.name && p.name.trim() !== '' && p.name !== 'undefined');

        if (productsToInsert.length === 0) {
            throw new Error("Nenhum produto válido encontrado. Verifique as colunas (Cod, Nome, Valor, IPI).");
        }

        const { error } = await supabase.from('products').insert(productsToInsert);

        if (error) throw error;

        setMessage({ type: 'success', text: `${productsToInsert.length} produtos importados com sucesso!` });
        fetchData();
        setTimeout(() => {
            setIsImportModalOpen(false);
            setMessage(null);
        }, 2000);

      } catch (error: any) {
        console.error("Erro importação:", error);
        setMessage({ type: 'error', text: 'Erro na importação: ' + (error.message || 'Verifique o formato do arquivo.') });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };


  // --- FILTRAGEM ---

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cod && p.cod.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesIndustry = filterIndustry ? p.industry_id === filterIndustry : true;

    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Produtos</h2>
          <p className="text-slate-500 mt-1">Gerencie seu catálogo de produtos, preços e IPI</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button 
             onClick={handleCopySql}
             className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
             title="Copiar Script SQL"
           >
             {showSqlSuccess ? <CheckCircle2 size={20} className="text-green-400" /> : <Database size={20} />}
           </button>
            <button 
                onClick={handleOpenImportModal}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
            >
                <FileSpreadsheet size={20} />
                Importar Excel
            </button>
            <button 
                onClick={() => handleOpenModal()}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
                <Plus size={20} />
                Novo Produto
            </button>
        </div>
      </div>

      {message && message.type === 'error' && (
        <div className="p-4 rounded-lg flex items-start gap-3 text-sm bg-red-50 text-red-700 border border-red-200">
           <AlertCircle size={18} className="mt-0.5 shrink-0"/>
           <span>{message.text}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full md:w-64 relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <select 
                value={filterIndustry} 
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
             >
                <option value="">Todas as Indústrias</option>
                {industries.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>
                ))}
             </select>
        </div>
      </div>

      {/* LISTA (TABELA) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-medium tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-24">Código</th>
                            <th className="px-6 py-4">Produto</th>
                            <th className="px-6 py-4">Indústria</th>
                            <th className="px-6 py-4">Preço</th>
                            <th className="px-6 py-4">IPI</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package size={48} className="text-slate-300 mb-3" />
                                        <p className="font-medium">Nenhum produto encontrado.</p>
                                        {industries.length === 0 && <p className="text-sm text-red-400 mt-2">Você precisa cadastrar Indústrias primeiro.</p>}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                        {product.cod || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {product.name}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Factory size={14} className="text-slate-400"/>
                                        {(product as any).industry?.nome_fantasia || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {product.ipi > 0 ? `${product.ipi}%` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(product)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => setDeleteConfirm(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* --- MODAL IMPORTAÇÃO --- */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
             <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                         <FileSpreadsheet className="text-emerald-600" /> Importar Produtos
                     </h3>
                     <button onClick={() => setIsImportModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                 </div>

                 {message && message.type === 'success' && (
                     <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
                         <CheckCircle2 size={16}/> {message.text}
                     </div>
                 )}

                 <form onSubmit={handleImportSubmit} className="space-y-6">
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">1. Selecione a Indústria de Destino</label>
                         <select 
                             value={importIndustryId} 
                             onChange={(e) => setImportIndustryId(e.target.value)}
                             className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                             required
                         >
                             <option value="">Selecione...</option>
                             {industries.map(ind => (
                                 <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>
                             ))}
                         </select>
                         <p className="text-xs text-slate-500 mt-1">Os produtos importados serão vinculados a esta indústria.</p>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">2. Selecione o Arquivo (.xls, .xlsx)</label>
                         <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                             <Upload className="text-slate-400 mb-2" size={32} />
                             <input 
                                 type="file" 
                                 ref={fileInputRef}
                                 accept=".xlsx, .xls"
                                 className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                 required 
                             />
                             <p className="text-xs text-slate-400 mt-2">Colunas esperadas: Cod, Nome, Valor, IPI</p>
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                         <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                         <button 
                             type="submit" 
                             disabled={isImporting || !importIndustryId} 
                             className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                             {isImporting ? <Loader2 className="animate-spin" size={18} /> : 'Iniciar Importação'}
                         </button>
                     </div>
                 </form>
             </div>
          </div>
      )}

      {/* --- MODAL ADICIONAR / EDITAR --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {formData.id ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {message && (
                <div className={`p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Indústria */}
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Indústria</label>
                 <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        name="industry_id" 
                        value={formData.industry_id} 
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        required
                    >
                        <option value="">Selecione uma indústria...</option>
                        {industries.map(ind => (
                            <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>
                        ))}
                    </select>
                 </div>
                 {industries.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhuma indústria cadastrada.</p>}
              </div>

              {/* Código */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código (SKU/COD)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="cod" value={formData.cod} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: 10025" />
                  </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Parafuso Sextavado" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" required />
                  </div>
                </div>
                {/* IPI */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IPI (%)</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" step="0.1" name="ipi" value={formData.ipi} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                  </div>
                </div>
              </div>

            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm disabled:opacity-70">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
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
                  <h3 className="text-lg font-bold text-slate-900">Excluir Produto?</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">Esta ação removerá permanentemente o produto.</p>
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

export default Products;