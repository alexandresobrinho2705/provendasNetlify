import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  MapPin, 
  User, 
  Building2, 
  Phone, 
  Mail,
  CheckCircle2,
  AlertCircle,
  Database,
  Eye,
  FileDown,
  Share2,
  Briefcase,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Client, ClientType, ClientStatus } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';
import { jsPDF } from 'jspdf';

const Customers: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Lista de Segmentos carregada dos Parâmetros
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false); // Criar/Editar
  const [viewClient, setViewClient] = useState<Client | null>(null); // Visualizar
  const [clientToDelete, setClientToDelete] = useState<string | null>(null); // Modal Confirmação Exclusão

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSegment, setFilterSegment] = useState<string>('');

  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);
  
  // Form State
  const initialFormState: Client = {
    id: '',
    type: 'PJ',
    status: 'Ativo',
    document: '',
    name: '',
    fantasy_name: '',
    segment: '',
    ie: '',
    general_contact_name: '',
    email: '',
    phone: '',
    cellphone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    buyer1_name: '',
    buyer1_email: '',
    buyer1_whatsapp: '',
    buyer2_name: '',
    buyer2_email: '',
    buyer2_whatsapp: ''
  };

  const [formData, setFormData] = useState<Client>(initialFormState);

  useEffect(() => {
    fetchClients();
    fetchParameters();
  }, [user]);

  const fetchParameters = async () => {
    if (!user) return;
    try {
       const { data } = await supabase
         .from('system_parameters')
         .select('segment_types')
         .eq('owner_id', user.id)
         .maybeSingle();
         
       if (data && data.segment_types) {
         setAvailableSegments(data.segment_types);
       }
    } catch (err) {
      console.error("Erro ao carregar segmentos", err);
    }
  };

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      if (data) setClients(data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Masks
  const masks = {
    cpf: (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14),
    cnpj: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').substring(0, 18),
    phone: (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15),
    cep: (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9),
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'document') {
      finalValue = formData.type === 'PJ' ? masks.cnpj(value) : masks.cpf(value);
    } else if (name === 'phone' || name === 'cellphone' || name.includes('whatsapp')) {
      finalValue = masks.phone(value);
    } else if (name === 'cep') {
      finalValue = masks.cep(value);
    }

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

  const handleOpenModal = (client?: Client) => {
    setMessage(null);
    // Recarrega parâmetros para garantir lista atualizada
    fetchParameters(); 
    
    if (client) {
      setFormData(client);
    } else {
      setFormData({ ...initialFormState }); 
    }
    setViewClient(null); // Fecha visualização se estiver aberta
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (client: Client) => {
    setViewClient(client);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = async (newStatus: ClientStatus) => {
    if (!viewClient) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: newStatus })
        .eq('id', viewClient.id);

      if (error) throw error;

      const updatedClient = { ...viewClient, status: newStatus };
      setViewClient(updatedClient);
      setClients(prev => prev.map(c => c.id === viewClient.id ? updatedClient : c));
      
      alert(`Status atualizado para ${newStatus}`);

    } catch (error: any) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    }).catch(err => {
      console.error('Erro ao copiar', err);
      alert('Erro ao copiar SQL. Veja o console.');
    });
  };

  const generatePDF = (client: Client) => {
    const doc = new jsPDF();
    const primaryColor = '#4f46e5';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(client.fantasy_name || client.name, 10, 20);
    
    // Status
    doc.setFontSize(10);
    doc.text(`Status: ${client.status}`, 150, 20);

    // Body
    doc.setTextColor(0, 0, 0);
    let yPos = 45;

    const addLine = (label: string, value: string | undefined) => {
      if (!value) return;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPos);
      yPos += 8;
    };

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados Cadastrais', 10, yPos);
    yPos += 10;
    doc.line(10, yPos - 5, 200, yPos - 5);

    addLine('Tipo:', client.type);
    addLine('Documento:', client.document);
    addLine('Razão Social / Nome:', client.name);
    if(client.type === 'PJ') {
      addLine('Nome Fantasia:', client.fantasy_name);
      addLine('Inscrição Estadual:', client.ie);
      addLine('Segmento:', client.segment);
    }

    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Contato e Endereço', 10, yPos);
    yPos += 10;
    doc.line(10, yPos - 5, 200, yPos - 5);

    addLine('Email:', client.email);
    addLine('Telefone:', client.phone);
    addLine('Celular/WhatsApp:', client.cellphone);
    addLine('Endereço:', `${client.address}, ${client.number} ${client.complement || ''}`);
    addLine('Bairro:', client.neighborhood);
    addLine('Cidade/UF:', `${client.city} - ${client.state}`);
    addLine('CEP:', client.cep);

    if (client.type === 'PJ') {
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Compradores', 10, yPos);
      yPos += 10;
      doc.line(10, yPos - 5, 200, yPos - 5);
      
      if (client.buyer1_name) {
         addLine('Comprador 1:', client.buyer1_name);
         addLine('Email C1:', client.buyer1_email);
         addLine('Whats C1:', client.buyer1_whatsapp);
         yPos += 5;
      }
      if (client.buyer2_name) {
         addLine('Comprador 2:', client.buyer2_name);
         addLine('Email C2:', client.buyer2_email);
         addLine('Whats C2:', client.buyer2_whatsapp);
      }
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Gerado em ${new Date().toLocaleDateString()} pelo sistema Nexus Sales Manager`, 10, 280);

    doc.save(`cliente_${client.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const handleShare = async (client: Client) => {
    const shareData = {
      title: `Dados do Cliente: ${client.name}`,
      text: `Cliente: ${client.name}\nDoc: ${client.document}\nEmail: ${client.email}\nTel: ${client.cellphone}`,
      url: window.location.href // Em um app real, seria um link público para o cliente
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Erro ao compartilhar nativamente', err);
      }
    } else {
      // Fallback para WhatsApp
      const text = encodeURIComponent(`*Ficha do Cliente*\n\n*Nome:* ${client.name}\n*Doc:* ${client.document}\n*Email:* ${client.email}\n*Cidade:* ${client.city}-${client.state}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = { ...formData, owner_id: user?.id };
      
      if (!payload.id) {
        delete (payload as any).id;
      }

      const { data, error } = await supabase
        .from('clients')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      setMessage({ type: 'success', text: 'Cliente salvo com sucesso!' });
      
      if (formData.id) {
        setClients(prev => prev.map(c => c.id === formData.id ? (data as Client) : c));
      } else {
        setClients(prev => [...prev, (data as Client)]);
      }

      setTimeout(() => {
        setIsSaving(false);
        setIsModalOpen(false);
        setMessage(null);
      }, 1000);

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao salvar: ' + (error.message || 'Erro desconhecido') });
      setIsSaving(false);
    }
  };

  // Botão "Lixeira" clicado na tabela
  const handleDeleteClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setClientToDelete(id);
  };

  // Confirmar Exclusão (Ação Real)
  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientToDelete);
      
      if (error) {
        console.error("Erro no delete Supabase:", error);
        throw error;
      }

      setClients(prev => prev.filter(c => c.id !== clientToDelete));
      
      // Se estiver visualizando o cliente que foi excluído, fecha o modal
      if (viewClient?.id === clientToDelete) setViewClient(null);
      
      setClientToDelete(null); // Fecha modal de confirmação
    } catch (error: any) {
      // Tratamento de erro de chave estrangeira
      if (error.message?.includes('violates foreign key constraint') || error.code === '23503') {
         alert('Não é possível excluir este cliente pois ele possui Pedidos ou Orçamentos vinculados. Exclua os pedidos primeiro ou atualize o Schema SQL.');
      } else {
         alert('Erro ao excluir: ' + (error.message || JSON.stringify(error)));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtragem
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fantasy_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document.includes(searchTerm);
    
    const matchesStatus = filterStatus ? c.status === filterStatus : true;
    const matchesSegment = filterSegment ? c.segment?.toLowerCase() === filterSegment.toLowerCase() : true;

    return matchesSearch && matchesStatus && matchesSegment;
  });

  // Lista única de segmentos para o filtro
  // Se não tiver nenhum, usa os loaded segments, se tiver clientes, usa os dos clientes também
  const uniqueSegments = Array.from(new Set([...clients.map(c => c.segment).filter(Boolean), ...availableSegments]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="text-slate-500 mt-1">Gerencie sua carteira de clientes PJ e PF</p>
        </div>
        <div className="flex gap-2">
          {/* BOTÃO COPIAR SQL */}
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
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, fantasia ou documento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Em Prospecção">Em Prospecção</option>
            </select>

            <select 
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">Todos os Segmentos</option>
                {uniqueSegments.map(seg => (
                    <option key={seg as string} value={seg as string}>{seg}</option>
                ))}
            </select>
            
            <button 
                onClick={() => {setSearchTerm(''); setFilterStatus(''); setFilterSegment('');}}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
            <Filter size={18} /> Limpar
            </button>
        </div>
      </div>

      {/* Tabela de Listagem */}
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
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Documento</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4">Segmento</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredClients.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                    Nenhum cliente encontrado.
                                </td>
                            </tr>
                        )}
                        {filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${client.type === 'PJ' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {client.type === 'PJ' ? <Building2 size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 truncate max-w-[200px]" title={client.fantasy_name || client.name}>
                                                {client.type === 'PJ' ? (client.fantasy_name || client.name) : client.name}
                                            </p>
                                            <p className="text-xs text-slate-500">{client.city} - {client.state}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{client.document}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex flex-col">
                                        <span>{client.cellphone || client.phone}</span>
                                        <span className="text-xs text-slate-400 truncate max-w-[150px]">{client.email}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {client.segment ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">
                                            {client.segment}
                                        </span>
                                    ) : <span className="text-slate-400">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${client.status === 'Ativo' ? 'bg-green-100 text-green-700' : 
                                        client.status === 'Inativo' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {client.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleOpenViewModal(client)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Visualizar">
                                            <Eye size={18} />
                                        </button>
                                        <button onClick={() => handleOpenModal(client)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={(e) => handleDeleteClick(client.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setClientToDelete(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                   <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir Cliente?</h3>
                <p className="text-sm text-slate-500 mb-6">
                   Você tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e removerá os dados permanentemente.
                </p>
                <div className="flex gap-3 w-full">
                   <button 
                     onClick={() => setClientToDelete(null)}
                     className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={confirmDelete}
                     disabled={isDeleting}
                     className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                   >
                     {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Excluir'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE VISUALIZAÇÃO --- */}
      {viewClient && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewClient(null)}></div>
            <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               {/* Header Visual */}
               <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white flex justify-between items-start">
                   <div>
                       <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-white/20 rounded-lg">
                               {viewClient.type === 'PJ' ? <Building2 size={24} /> : <User size={24} />}
                           </div>
                           <h2 className="text-2xl font-bold">{viewClient.fantasy_name || viewClient.name}</h2>
                       </div>
                       <p className="opacity-90">{viewClient.type === 'PJ' ? viewClient.name : 'Pessoa Física'} • {viewClient.document}</p>
                   </div>
                   <button onClick={() => setViewClient(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
               </div>

               {/* Toolbar de Ações Rápidas */}
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
                   <div className="flex items-center gap-2">
                       <span className="text-xs font-semibold text-slate-500 uppercase">Alterar Status:</span>
                       <button onClick={() => handleUpdateStatus('Ativo')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${viewClient.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border-slate-200 hover:border-green-300 text-slate-600'}`}>Ativo</button>
                       <button onClick={() => handleUpdateStatus('Inativo')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${viewClient.status === 'Inativo' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border-slate-200 hover:border-red-300 text-slate-600'}`}>Inativo</button>
                       <button onClick={() => handleUpdateStatus('Em Prospecção')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${viewClient.status === 'Em Prospecção' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white border-slate-200 hover:border-amber-300 text-slate-600'}`}>Prospect</button>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => generatePDF(viewClient)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm" title="Baixar PDF">
                           <FileDown size={16} /> PDF
                       </button>
                       <button onClick={() => handleShare(viewClient)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm" title="Compartilhar">
                           <Share2 size={16} />
                       </button>
                   </div>
               </div>

               {/* Conteúdo Detalhado */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Bloco 1 */}
                       <div className="space-y-4">
                           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Gerais</h3>
                           <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                               <div className="text-slate-500">Documento</div>
                               <div className="font-medium text-slate-800">{viewClient.document}</div>
                               
                               <div className="text-slate-500">Segmento</div>
                               <div className="font-medium text-slate-800">{viewClient.segment || '-'}</div>

                               {viewClient.type === 'PJ' && (
                                   <>
                                     <div className="text-slate-500">Inscr. Estadual</div>
                                     <div className="font-medium text-slate-800">{viewClient.ie || 'Isento'}</div>
                                   </>
                               )}
                           </div>
                       </div>

                       {/* Bloco 2 */}
                       <div className="space-y-4">
                           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Contato</h3>
                           <div className="space-y-3 text-sm">
                               <div className="flex items-center gap-3">
                                   <Mail size={16} className="text-indigo-500" />
                                   <span className="text-slate-700">{viewClient.email}</span>
                               </div>
                               <div className="flex items-center gap-3">
                                   <Phone size={16} className="text-indigo-500" />
                                   <span className="text-slate-700">{viewClient.cellphone} {viewClient.phone ? `/ ${viewClient.phone}` : ''}</span>
                               </div>
                               <div className="flex items-center gap-3 items-start">
                                   <MapPin size={16} className="text-indigo-500 mt-0.5" />
                                   <span className="text-slate-700">
                                       {viewClient.address}, {viewClient.number} {viewClient.complement}<br/>
                                       {viewClient.neighborhood} - {viewClient.city}/{viewClient.state}<br/>
                                       CEP: {viewClient.cep}
                                   </span>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Compradores (se houver) */}
                   {viewClient.type === 'PJ' && (viewClient.buyer1_name || viewClient.buyer2_name) && (
                       <div className="pt-4 border-t border-slate-100">
                           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Compradores</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {viewClient.buyer1_name && (
                                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                       <div className="font-semibold text-slate-800 mb-1">{viewClient.buyer1_name}</div>
                                       <div className="text-xs text-slate-500">{viewClient.buyer1_email}</div>
                                       <div className="text-xs text-slate-500">{viewClient.buyer1_whatsapp}</div>
                                   </div>
                               )}
                               {viewClient.buyer2_name && (
                                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                       <div className="font-semibold text-slate-800 mb-1">{viewClient.buyer2_name}</div>
                                       <div className="text-xs text-slate-500">{viewClient.buyer2_email}</div>
                                       <div className="text-xs text-slate-500">{viewClient.buyer2_whatsapp}</div>
                                   </div>
                               )}
                           </div>
                       </div>
                   )}
               </div>

               <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                   <button onClick={(e) => handleDeleteClick(viewClient.id, e)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">Excluir Cliente</button>
                   <button onClick={() => handleOpenModal(viewClient)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Editar Dados</button>
               </div>
            </div>
         </div>
      )}

      {/* --- MODAL FORM (CRIAR / EDITAR) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {formData.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
              
              {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Tipo e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Pessoa</label>
                  <div className="flex gap-4">
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="PJ" 
                        checked={formData.type === 'PJ'} 
                        onChange={handleChange}
                        className="peer hidden"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 border rounded-lg peer-checked:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:text-indigo-700 hover:bg-slate-50 transition-all">
                        <Building2 size={20} /> Pessoa Jurídica
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="PF" 
                        checked={formData.type === 'PF'} 
                        onChange={handleChange}
                        className="peer hidden"
                      />
                      <div className="flex items-center justify-center gap-2 p-3 border rounded-lg peer-checked:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:text-indigo-700 hover:bg-slate-50 transition-all">
                        <User size={20} /> Pessoa Física
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Em Prospecção">Em Prospecção</option>
                  </select>
                </div>
              </div>

              {/* Dados Principais */}
              <div className="space-y-6 mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Principais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                    <input type="text" name="document" value={formData.document} onChange={handleChange} maxLength={18} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={formData.type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'} required />
                  </div>
                  
                  {formData.type === 'PJ' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual</label>
                      <input type="text" name="ie" value={formData.ie} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  )}

                  <div className={formData.type === 'PF' ? 'md:col-span-2' : 'md:col-span-2'}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'PJ' ? 'Razão Social' : 'Nome Completo'}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Segmento / Ramo de Atividade</label>
                     <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                           name="segment" 
                           value={formData.segment || ''} 
                           onChange={handleChange} 
                           className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                        >
                           <option value="">Selecione um segmento...</option>
                           {availableSegments.map((seg, idx) => (
                              <option key={idx} value={seg}>{seg}</option>
                           ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                  </div>

                  {formData.type === 'PJ' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                        <input type="text" name="fantasy_name" value={formData.fantasy_name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contatos */}
              <div className="space-y-6 mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Contatos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                    <input type="text" name="cellphone" value={formData.cellphone} onChange={handleChange} maxLength={15} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Fixo</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} maxLength={15} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-6 mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                    <div className="relative">
                      <input type="text" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} maxLength={9} className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="00000-000" />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade - UF</label>
                    <div className="flex gap-2">
                       <input type="text" name="city" value={formData.city} readOnly className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none" />
                       <input type="text" name="state" value={formData.state} readOnly className="w-20 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Compradores (Apenas PJ) */}
              {formData.type === 'PJ' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Compradores</h3>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3 text-sm">Comprador 1</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="text" name="buyer1_name" placeholder="Nome" value={formData.buyer1_name} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      <input type="email" name="buyer1_email" placeholder="Email" value={formData.buyer1_email} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      <input type="text" name="buyer1_whatsapp" placeholder="WhatsApp" value={formData.buyer1_whatsapp} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3 text-sm">Comprador 2</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="text" name="buyer2_name" placeholder="Nome" value={formData.buyer2_name} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      <input type="email" name="buyer2_email" placeholder="Email" value={formData.buyer2_email} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      <input type="text" name="buyer2_whatsapp" placeholder="WhatsApp" value={formData.buyer2_whatsapp} onChange={handleChange} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              )}

            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm disabled:opacity-70">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;