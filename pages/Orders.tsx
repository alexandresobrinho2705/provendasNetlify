import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { 
  Order, OrderItem, OrderStatus, Client, Industry, Carrier, Product, SystemParameters, CommissionType, UserProfile, Company 
} from '../types';
import { 
  Search, Plus, Filter, Eye, Edit, Trash2, CheckCircle2, 
  AlertCircle, X, Save, Loader2, Database, FileText, 
  MapPin, Calendar, DollarSign, Package, Truck, ArrowRight,
  AlertTriangle, ShoppingCart, User, Mail, Phone, ChevronDown, UserCheck, FileDown, Share2
} from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';
import { jsPDF } from 'jspdf';

const Orders: React.FC = () => {
  const { user } = useAuth();
  
  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]); 
  const [params, setParams] = useState<SystemParameters | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  
  // Date Filters
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);

  // --- FORM STATE ---
  const initialFormState: Order = {
    id: '',
    number: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Em Aberto',
    client_id: '',
    industry_id: '',
    carrier_id: '',
    salesperson_id: '',
    payment_term: '',
    freight_type: '',
    delivery_address: '',
    delivery_deadline: '',
    observations: '',
    commission_type: 'GLOBAL',
    global_commission_rate: 0,
    total_value: 0,
    total_ipi: 0,
    items: []
  };

  const [formData, setFormData] = useState<Order>(initialFormState);
  
  // Product Search in Form
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchOrders(),
        fetchClients(),
        fetchIndustries(),
        fetchCarriers(),
        fetchParameters(),
        fetchTeam(),
        fetchCompany()
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FETCHERS ---

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:clients(*),
        industry:industries(nome_fantasia),
        carrier:carriers(nome_fantasia),
        salesperson:user_profiles(full_name),
        items:order_items(*)
      `)
      .order('date', { ascending: false });

    if (error && error.code !== '42P01') console.error('Error fetching orders:', error);
    if (data) setOrders(data as Order[]);
  };

  const fetchTeam = async () => {
    const { data, error } = await supabase.from('user_profiles').select('id, full_name, user_id').order('full_name');
    if (data) setTeam(data as UserProfile[]);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
      
    if (error) {
      console.error('Error fetching clients:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar clientes: ' + error.message });
    }
    if (data) setClients(data as Client[]);
  };

  const fetchIndustries = async () => {
    const { data, error } = await supabase.from('industries').select('*').order('nome_fantasia');
    if (error) console.error('Error fetching industries:', error);
    if (data) setIndustries(data as Industry[]);
  };

  const fetchCarriers = async () => {
    const { data, error } = await supabase.from('carriers').select('id, nome_fantasia').order('nome_fantasia');
    if (error) console.error('Error fetching carriers:', error);
    if (data) setCarriers(data as Carrier[]);
  };

  const fetchParameters = async () => {
    const { data } = await supabase.from('system_parameters').select('*').maybeSingle();
    if (data) setParams(data as SystemParameters);
  };

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').limit(1).single();
    if (data) setCompany(data as Company);
  };

  const fetchProductsByIndustry = async (industryId: string) => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('industry_id', industryId)
        .order('name');
        
    if (error) console.error('Error fetching products:', error);
    if (data) setProducts(data as Product[]);
  };

  // --- PDF GENERATION ---
  const generatePDF = (order: Order, share = false) => {
    const doc = new jsPDF();
    const primaryColor = '#111827'; // slate-900 like
    
    // -- Header --
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`Pedido #${order.number}`, 10, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${new Date(order.date).toLocaleDateString('pt-BR')}`, 10, 30);
    if (order.status) doc.text(`Status: ${order.status.toUpperCase()}`, 10, 35);

    // Company Info (Right Side Header)
    if (company) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(company.nome_fantasia || company.razao_social, 200, 15, { align: 'right' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(company.cnpj || '', 200, 20, { align: 'right' });
        doc.text(`${company.city} - ${company.state}`, 200, 25, { align: 'right' });
        doc.text(company.email || '', 200, 30, { align: 'right' });
    }

    let y = 55;

    // -- Cliente & Detalhes --
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Dados do Cliente", 10, y);
    doc.text("Detalhes do Pedido", 110, y);
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Cliente Col
    const clientName = order.client?.fantasy_name || order.client?.name || '';
    doc.text(`Cliente: ${clientName.substring(0, 40)}`, 10, y);
    y += 5;
    doc.text(`Doc: ${order.client?.document || '-'}`, 10, y);
    y += 5;
    doc.text(`Cidade: ${order.client?.city || '-'} / ${order.client?.state || '-'}`, 10, y);
    
    // Detalhes Col (Reset Y)
    y -= 10; 
    doc.text(`Vendedor: ${order.salesperson?.full_name || '-'}`, 110, y);
    y += 5;
    doc.text(`Pagamento: ${order.payment_term || '-'}`, 110, y);
    y += 5;
    doc.text(`Frete: ${order.freight_type || '-'}`, 110, y);

    y += 15;

    // -- Itens Table Header --
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, 190, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text("Produto", 12, y);
    doc.text("Qtd", 110, y, { align: 'center' });
    doc.text("Unitário", 140, y, { align: 'right' });
    doc.text("IPI", 165, y, { align: 'right' });
    doc.text("Total", 195, y, { align: 'right' });
    
    y += 8;
    doc.setFont('helvetica', 'normal');

    // -- Itens Loop --
    let totalItems = 0;
    order.items?.forEach((item, index) => {
        if (y > 270) { doc.addPage(); y = 20; } 
        
        // Zebra
        if (index % 2 === 0) {
            doc.setFillColor(252, 252, 252);
            doc.rect(10, y - 5, 190, 8, 'F');
        }

        const itemName = `${item.product_code} - ${item.product_name}`.substring(0, 50);
        
        doc.text(itemName, 12, y);
        doc.text(String(item.quantity), 110, y, { align: 'center' });
        doc.text(item.unit_price.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 140, y, { align: 'right' });
        
        const ipiVal = (item.ipi_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2});
        doc.text(ipiVal, 165, y, { align: 'right' });
        
        const totalVal = ((item.total_price || 0) + (item.ipi_total || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2});
        doc.text(totalVal, 195, y, { align: 'right' });

        totalItems += (item.total_price || 0);
        y += 7;
        
        // Obs do item
        if(item.item_observation) {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Obs: ${item.item_observation}`, 15, y - 2);
            doc.setFontSize(9);
            doc.setTextColor(0);
            y += 4;
        }
    });

    // -- Totais --
    y += 5;
    doc.line(10, y, 200, y);
    y += 7;
    
    doc.setFont('helvetica', 'bold');
    doc.text("Total Produtos:", 140, y, { align: 'right' });
    doc.text(order.total_value.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 195, y, { align: 'right' });
    y += 5;
    doc.text("Total IPI:", 140, y, { align: 'right' });
    doc.text((order.total_ipi || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2}), 195, y, { align: 'right' });
    y += 7;
    
    doc.setFillColor(primaryColor);
    doc.rect(130, y-5, 70, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("TOTAL GERAL:", 140, y+2, { align: 'right' });
    const grandTotal = (order.total_value || 0) + (order.total_ipi || 0);
    doc.text(`R$ ${grandTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 195, y+2, { align: 'right' });

    // -- Footer --
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text("Documento gerado eletronicamente por Nexus Sales Manager", 105, 290, { align: 'center' });

    // Output
    if (share) {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], `Pedido_${order.number}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file],
                title: `Pedido #${order.number}`,
                text: `Segue pedido para ${clientName}`
            }).catch(console.error);
        } else {
            doc.save(`Pedido_${order.number}.pdf`);
        }
    } else {
        doc.save(`Pedido_${order.number}.pdf`);
    }
  };

  // --- FILTER HELPERS ---

  // Gera lista de meses APENAS DO ANO ATUAL
  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    // Loop de Janeiro (0) a Dezembro (11) do ano atual
    for (let i = 0; i < 12; i++) {
        const d = new Date(currentYear, i, 1);
        const value = d.toISOString().slice(0, 7); // YYYY-MM
        // Formata apenas o nome do mês
        const label = d.toLocaleDateString('pt-BR', { month: 'long' });
        // Capitaliza a primeira letra
        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        options.push({ value, label: capitalizedLabel });
    }
    return options;
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMonth(val);
    if (val) {
      const [year, month] = val.split('-');
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setDateStart(formatDate(start));
      setDateEnd(formatDate(end));
    } else {
      setDateStart('');
      setDateEnd('');
    }
  };

  // --- HANDLERS FOR MODAL ---

  const handleOpenModal = (order?: Order) => {
    setMessage(null);
    if (order) {
      fetchProductsByIndustry(order.industry_id);
      setFormData(order);
    } else {
      // Tenta encontrar o profile ID do usuário atual para pré-selecionar
      const currentProfileId = team.find(t => t.user_id === user?.id)?.id || '';

      setFormData({ 
          ...initialFormState, 
          date: new Date().toISOString().split('T')[0],
          salesperson_id: currentProfileId // Default to current user
      });
      setProducts([]); 
    }
    setViewOrder(null);
    setIsModalOpen(true);
  };

  // --- HANDLERS FOR FORM ---
  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const industryId = e.target.value;
    setFormData(prev => ({ ...prev, industry_id: industryId, items: [] }));
    setProductSearchTerm('');
    if (industryId) fetchProductsByIndustry(industryId); else setProducts([]);
  };

  const handleProductSearch = (term: string) => { setProductSearchTerm(term); setShowProductDropdown(true); };

  const handleAddProduct = (product: Product) => {
    // Check for duplicates
    if (formData.items?.some(item => item.product_id === product.id)) {
        alert('Produto já incluso!');
        setProductSearchTerm(''); 
        setShowProductDropdown(false);
        return;
    }

    const ipiRate = product.ipi || 0;
    const quantity = 1;
    const unitPrice = product.price;
    const totalBase = unitPrice * quantity;
    const totalIpi = totalBase * (ipiRate / 100);

    const newItem: OrderItem = {
        product_id: product.id, product_code: product.cod || '', product_name: product.name,
        quantity: quantity, unit_price: unitPrice, total_price: totalBase, commission_rate: 0,
        item_observation: '', ipi_rate: ipiRate, ipi_total: totalIpi
    };

    setFormData(prev => {
        const newItems = [...(prev.items || []), newItem];
        return calculateTotal(newItems, prev);
    });
    setProductSearchTerm(''); setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData(prev => {
        const newItems = [...(prev.items || [])];
        const item = { ...newItems[index], [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
            item.quantity = parseFloat(item.quantity as any) || 0;
            item.unit_price = parseFloat(item.unit_price as any) || 0;
            item.total_price = item.quantity * item.unit_price;
            item.ipi_total = item.total_price * ((item.ipi_rate || 0) / 100);
        }
        newItems[index] = item;
        return calculateTotal(newItems, prev);
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
        const newItems = (prev.items || []).filter((_, i) => i !== index);
        return calculateTotal(newItems, prev);
    });
  };

  const calculateTotal = (items: OrderItem[], currentForm: Order): Order => {
    const totalBase = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const totalIpi = items.reduce((sum, item) => sum + (item.ipi_total || 0), 0);
    return { ...currentForm, items, total_value: totalBase, total_ipi: totalIpi };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    if (!formData.client_id || !formData.industry_id) {
        setMessage({ type: 'error', text: 'Cliente e Indústria são obrigatórios.' });
        setIsSaving(false);
        return;
    }

    try {
        const orderPayload = {
            // FIX: Use company's owner_id, falling back to user.id if admin
            owner_id: user?.owner_id || user?.id,
            date: formData.date,
            status: formData.status,
            client_id: formData.client_id,
            industry_id: formData.industry_id,
            carrier_id: formData.carrier_id || null,
            salesperson_id: formData.salesperson_id || null,
            payment_term: formData.payment_term,
            freight_type: formData.freight_type,
            delivery_address: formData.delivery_address,
            delivery_deadline: formData.delivery_deadline,
            observations: formData.observations,
            commission_type: formData.commission_type,
            global_commission_rate: formData.global_commission_rate,
            total_value: formData.total_value,
            total_ipi: formData.total_ipi
        };

        let orderId = formData.id;

        if (orderId) {
            const { error } = await supabase.from('orders').update(orderPayload).eq('id', orderId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('orders').insert(orderPayload).select().single();
            if (error) throw error;
            orderId = data.id;
        }

        if (formData.id) {
            await supabase.from('order_items').delete().eq('order_id', orderId);
        }

        const itemsPayload = formData.items?.map(item => ({
            order_id: orderId,
            product_id: item.product_id,
            product_code: item.product_code,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            commission_rate: item.commission_rate,
            item_observation: item.item_observation,
            ipi_rate: item.ipi_rate,
            ipi_total: item.ipi_total
        }));

        if (itemsPayload && itemsPayload.length > 0) {
            const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
            if (itemsError) throw itemsError;
        }

        setMessage({ type: 'success', text: 'Pedido salvo com sucesso!' });
        fetchOrders();
        setTimeout(() => { setIsModalOpen(false); setMessage(null); }, 1500);

    } catch (error: any) {
        console.error(error);
        setMessage({ type: 'error', text: 'Erro ao salvar: ' + (error.message || 'Erro desconhecido') });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
        const { error } = await supabase.from('orders').delete().eq('id', deleteConfirm);
        if (error) throw error;
        setOrders(prev => prev.filter(q => q.id !== deleteConfirm));
        setDeleteConfirm(null);
        if (viewOrder?.id === deleteConfirm) setViewOrder(null);
    } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
     try {
         const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
         if (error) throw error;
         
         const updated = { ...order, status: newStatus };
         setOrders(prev => prev.map(q => q.id === order.id ? updated : q));
         if (viewOrder?.id === order.id) setViewOrder(updated);
         alert(`Status atualizado para ${newStatus}`);
     } catch (error: any) {
         alert('Erro ao atualizar status.');
     }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    });
  };

  // --- RENDERING ---

  const filteredOrders = orders.filter(q => {
      // 1. Search Filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (q.client?.name || '').toLowerCase().includes(searchLower) ||
        (q.client?.fantasy_name || '').toLowerCase().includes(searchLower) ||
        (q.client?.document || '').includes(searchLower) ||
        (q.salesperson?.full_name || '').toLowerCase().includes(searchLower) ||
        String(q.number).includes(searchLower);

      // 2. Dropdown Filters
      const matchStatus = filterStatus ? q.status === filterStatus : true;
      const matchIndustry = filterIndustry ? q.industry_id === filterIndustry : true;
      
      // 3. Date Filters
      const qDate = new Date(q.date).getTime();
      const sDate = dateStart ? new Date(dateStart).getTime() : 0;
      const eDate = dateEnd ? new Date(dateEnd).getTime() : Infinity;
      const matchDate = qDate >= sDate && qDate <= eDate;

      return matchesSearch && matchStatus && matchIndustry && matchDate;
  });

  const filteredProducts = products.filter(p => 
     p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
     p.cod?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pedidos</h2>
          <p className="text-slate-500 mt-1">Gerencie os pedidos de venda e faturamento</p>
        </div>
        <div className="flex gap-2">
            <button 
             onClick={handleCopySql}
             className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium"
             title="Copiar Script SQL Atualizado"
           >
             {showSqlSuccess ? <CheckCircle2 size={20} className="text-green-400" /> : <Database size={20} />}
           </button>
           <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
           >
             <Plus size={20} />
             Novo Pedido
           </button>
        </div>
      </div>

      {/* Filters (LAYOUT CORRIGIDO) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
          
          {/* Row 1: Search Bar Full Width */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por Nº do Pedido, Cliente, Vendedor ou CNPJ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Row 2: Selects & Date & Clear */}
          <div className="flex flex-wrap gap-4 items-end">
              
              <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
                  <div className="relative">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                        <option value="">Todos</option>
                        <option value="Em Aberto">Em Aberto</option>
                        <option value="Fechado">Fechado</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Indústria</label>
                  <div className="relative">
                    <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                        <option value="">Todas</option>
                        {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  </div>
              </div>

              <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Mês ({new Date().getFullYear()})</label>
                  <div className="relative">
                    <select 
                        value={selectedMonth} 
                        onChange={handleMonthChange} 
                        className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                    >
                        <option value="">Selecione o Mês...</option>
                        {monthOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                  </div>
              </div>

              <div className="flex gap-2 flex-1 min-w-[250px]">
                  <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">De</label>
                      <input type="date" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setSelectedMonth(''); }} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Até</label>
                      <input type="date" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setSelectedMonth(''); }} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
              </div>

              <button 
                onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterIndustry(''); setDateStart(''); setDateEnd(''); setSelectedMonth(''); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2 h-[40px] shrink-0"
                title="Limpar Filtros"
              >
                 <Filter size={16} /> Limpar
              </button>
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
                        {/* Define widths to constrain other columns and let Client expand */}
                        <th className="px-6 py-4 w-[100px]">Nº</th>
                        <th className="px-6 py-4 w-[120px]">Data</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4 w-[150px]">Vendedor</th>
                        <th className="px-6 py-4 w-[140px]">Total</th>
                        <th className="px-6 py-4 w-[1%] whitespace-nowrap">Status</th>
                        <th className="px-6 py-4 text-right w-[1%] whitespace-nowrap">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                     {filteredOrders.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>}
                     {filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 font-mono text-slate-600">#{order.number}</td>
                           <td className="px-6 py-4 text-slate-600">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                           <td className="px-6 py-4 font-medium text-slate-900">
                               {order.client?.fantasy_name || order.client?.name}
                               <div className="text-[10px] text-slate-400 font-normal">{order.industry?.nome_fantasia}</div>
                           </td>
                           <td className="px-6 py-4 text-slate-600 text-xs">
                               {order.salesperson?.full_name || <span className="italic text-slate-400">Não def.</span>}
                           </td>
                           <td className="px-6 py-4 font-medium text-slate-900">R$ {((order.total_value || 0) + (order.total_ipi || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                ${order.status === 'Fechado' ? 'bg-green-50 text-green-700 border-green-200' :
                                  order.status === 'Finalizado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  order.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' : 
                                  'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {order.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                 <button onClick={() => setViewOrder(order)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={18} /></button>
                                 <button onClick={() => handleOpenModal(order)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18} /></button>
                                 <button onClick={() => setDeleteConfirm(order.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
        )}
      </div>

      {/* --- MODAL FORM (CRIAR / EDITAR) --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
             <div className="relative bg-white w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* ... Header ... */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                   <h2 className="text-lg font-bold text-slate-800">{formData.id ? `Editar Pedido #${formData.number}` : 'Novo Pedido'}</h2>
                   <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                   {/* ... Error Message ... */}
                   {message && message.type === 'error' && (
                      <div className="mb-4 p-4 rounded-lg flex items-start gap-3 text-sm bg-red-50 text-red-700 border border-red-200">
                         <AlertCircle size={18} className="mt-0.5"/> <span>{message.text}</span>
                      </div>
                   )}
                   
                   <form id="order-form" onSubmit={handleSave} className="space-y-6">
                       {/* 1. Cabeçalho */}
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Dados Gerais</h3>
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                                   <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as OrderStatus})} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500">
                                       <option value="Em Aberto">Em Aberto</option>
                                       <option value="Fechado">Fechado</option>
                                       <option value="Finalizado">Finalizado</option>
                                       <option value="Cancelado">Cancelado</option>
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Data</label>
                                   <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
                               </div>
                               <div className="md:col-span-2">
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Vendedor / Responsável</label>
                                   <div className="relative">
                                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                      <select 
                                        value={formData.salesperson_id || ''} 
                                        onChange={(e) => setFormData({...formData, salesperson_id: e.target.value})} 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                                      >
                                          <option value="">Selecione o Vendedor...</option>
                                          {team.map(t => (
                                              <option key={t.id} value={t.id}>{t.full_name}</option>
                                          ))}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                   </div>
                               </div>

                               <div className="md:col-span-2">
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Indústria <span className="text-red-500">*</span></label>
                                   <select value={formData.industry_id} onChange={handleIndustryChange} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required>
                                       <option value="">Selecione a Indústria...</option>
                                       {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>)}
                                   </select>
                               </div>
                               <div className="md:col-span-2">
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Cliente <span className="text-red-500">*</span></label>
                                   <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" required>
                                       <option value="">Selecione o Cliente...</option>
                                       {clients.map(c => <option key={c.id} value={c.id}>
                                          {c.fantasy_name || c.name} {c.status !== 'Ativo' ? `(${c.status})` : ''}
                                       </option>)}
                                   </select>
                               </div>
                               
                               {/* Comissão Config */}
                               <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                   <div>
                                       <label className="block text-xs font-semibold text-orange-600 mb-1">Tipo de Comissão</label>
                                       <select value={formData.commission_type} onChange={(e) => setFormData({...formData, commission_type: e.target.value as CommissionType})} className="w-full px-2 py-1.5 border border-orange-200 rounded text-sm outline-none bg-white">
                                           <option value="GLOBAL">Global (Pedido)</option>
                                           <option value="ITEM">Por Item</option>
                                       </select>
                                   </div>
                                   {formData.commission_type === 'GLOBAL' && (
                                       <div>
                                           <label className="block text-xs font-semibold text-orange-600 mb-1">% Comissão Global</label>
                                           <input type="number" step="0.1" value={formData.global_commission_rate} onChange={(e) => setFormData({...formData, global_commission_rate: parseFloat(e.target.value)})} className="w-full px-2 py-1.5 border border-orange-200 rounded text-sm outline-none" />
                                       </div>
                                   )}
                               </div>
                           </div>
                       </div>

                       {/* 2. Produtos */}
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Itens do Pedido</h3>
                           
                           {/* Search Product */}
                           <div className="relative mb-6">
                               <div className="relative">
                                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                   <input 
                                     type="text" 
                                     placeholder={!formData.industry_id ? "Selecione a indústria primeiro..." : "Buscar produto por nome ou código..."}
                                     value={productSearchTerm}
                                     onChange={(e) => handleProductSearch(e.target.value)}
                                     onFocus={() => setShowProductDropdown(true)}
                                     disabled={!formData.industry_id}
                                     className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                   />
                               </div>
                               
                               {/* Dropdown Results */}
                               {showProductDropdown && productSearchTerm && (
                                   <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                       {filteredProducts.length === 0 ? (
                                           <div className="p-4 text-sm text-slate-500 text-center">Nenhum produto encontrado.</div>
                                       ) : (
                                           filteredProducts.map(prod => (
                                               <button 
                                                 key={prod.id} 
                                                 type="button"
                                                 onClick={() => handleAddProduct(prod)}
                                                 className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                                               >
                                                   <div>
                                                       <div className="font-medium text-slate-900">{prod.name}</div>
                                                       <div className="text-xs text-slate-500 font-mono">{prod.cod}</div>
                                                   </div>
                                                   <div className="font-semibold text-indigo-600">
                                                       R$ {prod.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                   </div>
                                               </button>
                                           ))
                                       )}
                                   </div>
                               )}
                               {/* Overlay to close dropdown */}
                               {showProductDropdown && (
                                   <div className="fixed inset-0 z-10" onClick={() => setShowProductDropdown(false)}></div>
                               )}
                           </div>

                           {/* Items Table */}
                           <div className="overflow-x-auto">
                               <table className="w-full text-left text-sm">
                                   <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                       <tr>
                                           <th className="px-4 py-3 rounded-l-lg">Produto</th>
                                           <th className="px-4 py-3 w-24">Qtd</th>
                                           <th className="px-4 py-3 w-32">V. Unit</th>
                                           <th className="px-4 py-3 w-28 text-center">IPI</th>
                                           {formData.commission_type === 'ITEM' && <th className="px-4 py-3 w-24">% Com.</th>}
                                           <th className="px-4 py-3 w-32 text-right">Total Item</th>
                                           <th className="px-4 py-3">Obs</th>
                                           <th className="px-4 py-3 w-10 rounded-r-lg"></th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                       {formData.items?.length === 0 && (
                                           <tr>
                                               <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">Nenhum item adicionado.</td>
                                           </tr>
                                       )}
                                       {formData.items?.map((item, idx) => (
                                           <tr key={idx} className="group hover:bg-slate-50">
                                               <td className="px-4 py-3">
                                                   <div className="font-medium text-slate-900">{item.product_name}</div>
                                                   <div className="text-xs text-slate-500 font-mono">{item.product_code}</div>
                                               </td>
                                               <td className="px-4 py-3">
                                                   <input type="number" min="1" step="1" value={item.quantity} onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center outline-none focus:border-indigo-500" />
                                               </td>
                                               <td className="px-4 py-3">
                                                   <input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-right outline-none focus:border-indigo-500" />
                                               </td>
                                               {/* COLUNA IPI */}
                                               <td className="px-4 py-3 text-center">
                                                   <div className="text-xs font-medium text-slate-700">{item.ipi_rate || 0}%</div>
                                                   <div className="text-[10px] text-slate-500">R$ {(item.ipi_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                               </td>
                                               {formData.commission_type === 'ITEM' && (
                                                   <td className="px-4 py-3">
                                                       <input type="number" step="0.1" value={item.commission_rate} onChange={(e) => handleUpdateItem(idx, 'commission_rate', e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center outline-none focus:border-indigo-500" />
                                                   </td>
                                               )}
                                               <td className="px-4 py-3 font-medium text-slate-900 text-right">
                                                   R$ {((item.total_price || 0) + (item.ipi_total || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                               </td>
                                               <td className="px-4 py-3">
                                                   <input type="text" placeholder="Obs..." value={item.item_observation} onChange={(e) => handleUpdateItem(idx, 'item_observation', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-xs text-slate-600" />
                                               </td>
                                               <td className="px-4 py-3 text-right">
                                                   <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                                   <tfoot className="border-t border-slate-200 bg-slate-50/50">
                                        {/* LINHA 1: TOTAL PRODUTOS */}
                                       <tr>
                                           <td colSpan={formData.commission_type === 'ITEM' ? 5 : 4} className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total Produtos:</td>
                                           <td className="px-4 py-2 text-right font-medium text-slate-800">R$ {(formData.total_value.toLocaleString('pt-BR', {minimumFractionDigits: 2}))}</td>
                                       </tr>
                                       {/* LINHA 2: TOTAL IPI */}
                                       <tr>
                                           <td colSpan={formData.commission_type === 'ITEM' ? 5 : 4} className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total IPI:</td>
                                           <td className="px-4 py-2 text-right font-medium text-slate-800">R$ {(formData.total_ipi || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                       </tr>
                                       {/* LINHA 3: TOTAL GERAL */}
                                       <tr className="bg-slate-100">
                                           <td colSpan={formData.commission_type === 'ITEM' ? 5 : 4} className="px-4 py-3 text-right font-bold text-slate-800">TOTAL GERAL:</td>
                                           <td className="px-4 py-3 text-right font-bold text-indigo-700 text-lg">R$ {((formData.total_value || 0) + (formData.total_ipi || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                       </tr>
                                   </tfoot>
                               </table>
                           </div>
                       </div>

                       {/* 3. Rodapé e Logística */}
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Entrega e Pagamento</h3>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Condição de Pagamento</label>
                                   <select name="payment_term" value={formData.payment_term || ''} onChange={(e) => setFormData({...formData, payment_term: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                                       <option value="">Selecione...</option>
                                       {params?.payment_terms?.map((pt, i) => <option key={i} value={pt}>{pt}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Frete</label>
                                   <select name="freight_type" value={formData.freight_type || ''} onChange={(e) => setFormData({...formData, freight_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                                       <option value="">Selecione...</option>
                                       {params?.freight_types?.map((ft, i) => <option key={i} value={ft}>{ft}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Transportadora</label>
                                   <select name="carrier_id" value={formData.carrier_id || ''} onChange={(e) => setFormData({...formData, carrier_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                                       <option value="">Selecione...</option>
                                       {carriers.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia}</option>)}
                                   </select>
                               </div>
                               
                               <div className="md:col-span-2">
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Endereço de Entrega</label>
                                   <input type="text" value={formData.delivery_address || ''} onChange={(e) => setFormData({...formData, delivery_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Deixe em branco para usar o endereço do cliente" />
                               </div>
                               <div>
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Prazo de Entrega</label>
                                   <input type="text" value={formData.delivery_deadline || ''} onChange={(e) => setFormData({...formData, delivery_deadline: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none" placeholder="Ex: 10 dias úteis" />
                               </div>
                               
                               <div className="md:col-span-3">
                                   <label className="block text-xs font-semibold text-slate-500 mb-1">Observações Gerais</label>
                                   <textarea value={formData.observations || ''} onChange={(e) => setFormData({...formData, observations: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm outline-none min-h-[80px]" placeholder="Informações adicionais para o pedido..." />
                               </div>
                           </div>
                       </div>
                   </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancelar</button>
                    <button type="submit" form="order-form" disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar Pedido
                    </button>
                </div>
             </div>
          </div>
      )}

      {viewOrder && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewOrder(null)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               {/* Header Visual */}
               <div className="relative bg-slate-900 text-white p-8 overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ShoppingCart size={120} />
                  </div>
                  <button onClick={() => setViewOrder(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"><X size={20}/></button>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                             <h2 className="text-3xl font-bold">Pedido #{viewOrder.number}</h2>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                 viewOrder.status === 'Fechado' ? 'bg-green-500/20 border-green-400 text-green-300' :
                                 viewOrder.status === 'Finalizado' ? 'bg-blue-500/20 border-blue-400 text-blue-300' : 
                                 viewOrder.status === 'Cancelado' ? 'bg-red-500/20 border-red-400 text-red-300' :
                                 'bg-white/10 border-white/20 text-slate-300'
                             }`}>
                                 {viewOrder.status}
                             </span>
                        </div>
                        <p className="text-slate-300 flex items-center gap-2"><Calendar size={14}/> {new Date(viewOrder.date).toLocaleDateString('pt-BR')}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-slate-400 text-sm uppercase font-bold tracking-wider">Valor Total</p>
                        <p className="text-4xl font-bold text-white">R$ {((viewOrder.total_value || 0) + (viewOrder.total_ipi || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                     </div>
                  </div>
               </div>

               {/* Toolbar */}
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
                   <div className="flex items-center gap-2">
                       <span className="text-xs font-semibold text-slate-500 uppercase">Alterar Status:</span>
                       <button onClick={() => handleUpdateStatus(viewOrder, 'Em Aberto')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors hover:bg-white`}>Aberto</button>
                       <button onClick={() => handleUpdateStatus(viewOrder, 'Fechado')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors hover:bg-green-50 hover:text-green-700 hover:border-green-200`}>Fechado</button>
                       <button onClick={() => handleUpdateStatus(viewOrder, 'Finalizado')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200`}>Finalizado</button>
                       <button onClick={() => handleUpdateStatus(viewOrder, 'Cancelado')} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200`}>Cancelado</button>
                   </div>
                   <div className="flex gap-2">
                        <button onClick={() => generatePDF(viewOrder, false)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm" title="Baixar PDF">
                           <FileDown size={16} /> PDF
                       </button>
                       <button onClick={() => generatePDF(viewOrder, true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm" title="Compartilhar">
                           <Share2 size={16} />
                       </button>
                   </div>
               </div>

               {/* Body */}
               <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                   {/* Info Grid (CLIENTE EXPANDIDO) */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Box Cliente Completo */}
                       <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm h-full">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                               <User size={14} /> Dados do Cliente
                           </h4>
                           <div className="space-y-3">
                               <div>
                                   <div className="text-lg font-bold text-slate-800">{viewOrder.client?.fantasy_name || viewOrder.client?.name}</div>
                                   <div className="text-sm text-slate-500 font-medium">{viewOrder.client?.name}</div>
                               </div>
                               
                               <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-200 pt-3">
                                   <div>
                                       <span className="block text-xs text-slate-400">Documento</span>
                                       <span className="text-slate-700 font-medium">{viewOrder.client?.document}</span>
                                   </div>
                                   <div>
                                       <span className="block text-xs text-slate-400">Inscrição Estadual</span>
                                       <span className="text-slate-700">{viewOrder.client?.ie || 'Isento'}</span>
                                   </div>
                               </div>

                               <div className="text-sm border-t border-slate-200 pt-3 space-y-2">
                                   <div className="flex items-start gap-2">
                                       <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                       <span className="text-slate-600">
                                           {viewOrder.client?.address}, {viewOrder.client?.number} {viewOrder.client?.complement}<br/>
                                           {viewOrder.client?.neighborhood} - {viewOrder.client?.city}/{viewOrder.client?.state}<br/>
                                           CEP: {viewOrder.client?.cep}
                                       </span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <Mail size={14} className="text-slate-400 shrink-0" />
                                       <a href={`mailto:${viewOrder.client?.email}`} className="text-indigo-600 hover:underline">{viewOrder.client?.email}</a>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <Phone size={14} className="text-slate-400 shrink-0" />
                                       <span className="text-slate-600">{viewOrder.client?.cellphone} {viewOrder.client?.phone ? `/ ${viewOrder.client?.phone}` : ''}</span>
                                   </div>
                                   {viewOrder.client?.general_contact_name && (
                                       <div className="flex items-center gap-2">
                                           <User size={14} className="text-slate-400 shrink-0" />
                                           <span className="text-slate-600">Contato: <strong>{viewOrder.client?.general_contact_name}</strong></span>
                                       </div>
                                   )}
                               </div>
                           </div>
                       </div>

                       {/* Detalhes Comerciais */}
                       <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                               <FileText size={14} /> Detalhes da Proposta
                           </h4>
                           <div className="space-y-3 text-sm">
                               <div className="flex justify-between border-b border-slate-50 pb-2">
                                   <span className="text-slate-500">Vendedor</span>
                                   <span className="font-medium text-slate-800">{viewOrder.salesperson?.full_name || 'Não informado'}</span>
                               </div>
                               <div className="flex justify-between border-b border-slate-50 pb-2">
                                   <span className="text-slate-500">Indústria</span>
                                   <span className="font-medium text-slate-800">{viewOrder.industry?.nome_fantasia}</span>
                               </div>
                               <div className="flex justify-between border-b border-slate-50 pb-2">
                                   <span className="text-slate-500">Cond. Pagamento</span>
                                   <span className="font-medium text-slate-800">{viewOrder.payment_term || '-'}</span>
                               </div>
                               <div className="flex justify-between border-b border-slate-50 pb-2">
                                   <span className="text-slate-500">Frete</span>
                                   <span className="font-medium text-slate-800">{viewOrder.freight_type || '-'}</span>
                               </div>
                               <div className="flex justify-between border-b border-slate-50 pb-2">
                                   <span className="text-slate-500">Transportadora</span>
                                   <span className="font-medium text-slate-800">{viewOrder.carrier?.nome_fantasia || '-'}</span>
                               </div>
                               <div className="flex justify-between pt-2">
                                   <span className="text-slate-500">Comissão</span>
                                   <span className="font-medium text-green-600">
                                       {viewOrder.commission_type === 'GLOBAL' 
                                          ? `${viewOrder.global_commission_rate}% (Global)` 
                                          : 'Item a Item'}
                                   </span>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Items Table */}
                   <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itens</h4>
                       <table className="w-full text-sm text-left border border-slate-100 rounded-lg overflow-hidden">
                           <thead className="bg-slate-50 text-slate-500 font-medium">
                               <tr>
                                   <th className="px-4 py-2">Produto</th>
                                   <th className="px-4 py-2 text-center">Qtd</th>
                                   <th className="px-4 py-2 text-right">Unitário</th>
                                   <th className="px-4 py-2 text-right">IPI</th>
                                   <th className="px-4 py-2 text-right">Total</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {viewOrder.items?.map((item, i) => (
                                   <tr key={i}>
                                       <td className="px-4 py-3">
                                           <div className="text-slate-900 font-medium">{item.product_name}</div>
                                           <div className="text-xs text-slate-500">{item.product_code}</div>
                                           {item.item_observation && <div className="text-xs text-indigo-500 italic mt-1">{item.item_observation}</div>}
                                       </td>
                                       <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                                       <td className="px-4 py-3 text-right text-slate-600">R$ {item.unit_price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                       <td className="px-4 py-3 text-right text-slate-600">
                                           <div className="text-xs">{item.ipi_rate || 0}%</div>
                                           R$ {(item.ipi_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                       </td>
                                       <td className="px-4 py-3 text-right font-medium text-slate-900">R$ {((item.total_price || 0) + (item.ipi_total || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                   </tr>
                               ))}
                           </tbody>
                           <tfoot className="bg-slate-50">
                               <tr>
                                   <td colSpan={4} className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total Produtos:</td>
                                   <td className="px-4 py-2 text-right font-medium text-slate-800">R$ {(viewOrder.total_value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                               </tr>
                               <tr>
                                   <td colSpan={4} className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total IPI:</td>
                                   <td className="px-4 py-2 text-right font-medium text-slate-800">R$ {(viewOrder.total_ipi || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                               </tr>
                               <tr>
                                   <td colSpan={4} className="px-4 py-2 text-right font-bold text-slate-800">TOTAL GERAL:</td>
                                   <td className="px-4 py-2 text-right font-bold text-indigo-700 text-lg">R$ {((viewOrder.total_value || 0) + (viewOrder.total_ipi || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                               </tr>
                           </tfoot>
                       </table>
                   </div>

                   {/* Footer Info */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Endereço de Entrega</h4>
                           <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                               {viewOrder.delivery_address || 'Mesmo endereço do cadastro.'}
                           </p>
                           {viewOrder.delivery_deadline && (
                               <div className="mt-3 text-sm text-slate-600">
                                   <span className="font-medium">Prazo:</span> {viewOrder.delivery_deadline}
                               </div>
                           )}
                       </div>
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Observações</h4>
                           <p className="text-sm text-slate-600 whitespace-pre-line bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                               {viewOrder.observations || 'Nenhuma observação.'}
                           </p>
                       </div>
                   </div>
               </div>
            </div>
         </div>
      )}

      {/* --- DELETE CONFIRMATION --- */}
      {deleteConfirm && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
               <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24}/></div>
                  <h3 className="text-lg font-bold text-slate-900">Excluir Pedido?</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6">Esta ação removerá permanentemente o registro.</p>
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

export default Orders;