import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Order, Industry } from '../types';
import { 
  DollarSign, 
  Filter, 
  Search, 
  FileDown, 
  Share2, 
  Loader2, 
  Calendar, 
  TrendingUp, 
  Briefcase 
} from 'lucide-react';
import { jsPDF } from 'jspdf';

// Tipagem estendida para incluir o valor calculado da comissão na lista
interface OrderWithCommission extends Order {
  calculated_commission: number;
}

const Commissions: React.FC = () => {
  const { user } = useAuth();
  
  // Data States
  const [orders, setOrders] = useState<OrderWithCommission[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filters
  const [filterIndustry, setFilterIndustry] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Initial Load
  useEffect(() => {
    if (user) {
      fetchIndustries();
      // Inicializa datas com o mês atual
      handleMonthChange({ target: { value: new Date().toISOString().slice(0, 7) } } as any);
    }
  }, [user]);

  // Refetch when filters change
  useEffect(() => {
    if (dateStart && dateEnd) {
      fetchCommissions();
    }
  }, [dateStart, dateEnd, filterIndustry]);

  const fetchIndustries = async () => {
    const { data } = await supabase.from('industries').select('id, nome_fantasia').order('nome_fantasia');
    if (data) setIndustries(data as Industry[]);
  };

  const fetchCommissions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients(name, fantasy_name),
          industry:industries(nome_fantasia),
          salesperson:user_profiles(full_name),
          items:order_items(total_price, commission_rate)
        `)
        .eq('status', 'Fechado') // REGRA: Apenas pedidos fechados
        .gte('date', `${dateStart}T00:00:00`)
        .lte('date', `${dateEnd}T23:59:59`)
        .order('date', { ascending: false });

      if (filterIndustry) {
        query = query.eq('industry_id', filterIndustry);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Calcular comissão para cada pedido
        const processedOrders: OrderWithCommission[] = data.map((order: any) => {
          let commValue = 0;
          
          if (order.commission_type === 'GLOBAL') {
            commValue = (order.total_value * (order.global_commission_rate || 0)) / 100;
          } else {
            // ITEM: Soma das comissões individuais
            commValue = order.items?.reduce((acc: number, item: any) => {
              return acc + ((item.total_price || 0) * (item.commission_rate || 0) / 100);
            }, 0) || 0;
          }

          return {
            ...order,
            calculated_commission: commValue
          };
        });

        setOrders(processedOrders);
      }
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers de Data ---

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // ex: "2023-10"
    setSelectedMonth(val);
    if (val) {
      const [year, month] = val.split('-');
      // Primeiro dia
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      // Último dia
      const end = new Date(parseInt(year), parseInt(month), 0);
      
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setDateStart(formatDate(start));
      setDateEnd(formatDate(end));
    }
  };

  // --- Totais ---
  const totalSales = orders.reduce((sum, o) => sum + o.total_value, 0);
  const totalCommission = orders.reduce((sum, o) => sum + o.calculated_commission, 0);
  const avgRate = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0;

  // --- PDF & Share ---

  const generatePDF = async (share = false) => {
    setIsGeneratingPdf(true);
    const doc = new jsPDF();
    
    // Header Colorido
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Relatório de Comissões', 10, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 10, 30);
    doc.text(`Período: ${new Date(dateStart).toLocaleDateString()} a ${new Date(dateEnd).toLocaleDateString()}`, 10, 35);

    // Resumo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Período', 10, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Vendas: R$ ${totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 10, 60);
    doc.text(`Total de Comissões: R$ ${totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 10, 66);
    doc.text(`Pedidos Fechados: ${orders.length}`, 100, 60);
    doc.text(`Média de Comissão: ${avgRate.toFixed(2)}%`, 100, 66);

    // Tabela Cabeçalho
    let y = 80;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, 190, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    doc.text('Data', 12, y);
    doc.text('Pedido', 35, y);
    doc.text('Cliente', 55, y);
    doc.text('Vendedor', 95, y); // Nova coluna
    doc.text('Indústria', 125, y);
    doc.text('Venda', 160, y);
    doc.text('Comissão', 185, y);

    y += 8;
    doc.setFont('helvetica', 'normal');

    // Linhas
    orders.forEach((order, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        // Reprint header if new page
        doc.setFont('helvetica', 'bold');
        doc.text('Data', 12, y);
        doc.text('Pedido', 35, y);
        doc.text('Cliente', 55, y);
        doc.text('Vendedor', 95, y);
        doc.text('Indústria', 125, y);
        doc.text('Venda', 160, y);
        doc.text('Comissão', 185, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
      }

      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, y - 5, 190, 8, 'F');
      }

      const dateStr = new Date(order.date).toLocaleDateString('pt-BR');
      const clientName = (order.client?.fantasy_name || order.client?.name || '').substring(0, 20);
      const sellerName = (order.salesperson?.full_name || '-').substring(0, 15);
      const indName = (order.industry?.nome_fantasia || '').substring(0, 15);
      
      doc.text(dateStr, 12, y);
      doc.text(`#${order.number}`, 35, y);
      doc.text(clientName, 55, y);
      doc.text(sellerName, 95, y);
      doc.text(indName, 125, y);
      doc.text(order.total_value.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 160, y);
      doc.setFont('helvetica', 'bold');
      doc.text(order.calculated_commission.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 185, y);
      doc.setFont('helvetica', 'normal');

      y += 8;
    });

    // Total Footer no PDF
    y += 5;
    doc.line(10, y, 200, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAIS:', 125, y);
    doc.text(totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 160, y);
    doc.text(totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2}), 185, y);

    if (share) {
        const pdfBlob = doc.output('blob');
        const file = new File([pdfBlob], 'Relatorio_Comissoes.pdf', { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Relatório de Comissões',
                    text: 'Segue em anexo o relatório de comissões gerado pelo Nexus Sales Manager.'
                });
            } catch (err) {
                console.log('Erro ao compartilhar', err);
            }
        } else {
            doc.save('Relatorio_Comissoes.pdf');
        }
    } else {
        doc.save('Relatorio_Comissoes.pdf');
    }
    
    setIsGeneratingPdf(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Relatório de Comissões</h2>
          <p className="text-slate-500 mt-1">Análise financeira de pedidos fechados</p>
        </div>
      </div>

      {/* --- Filtros --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
              
              {/* Seletor de Indústria */}
              <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Indústria</label>
                  <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        value={filterIndustry} 
                        onChange={(e) => setFilterIndustry(e.target.value)} 
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
                      >
                          <option value="">Todas as Indústrias</option>
                          {industries.map(ind => <option key={ind.id} value={ind.id}>{ind.nome_fantasia}</option>)}
                      </select>
                  </div>
              </div>

              {/* Seletor Mês */}
              <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Mês</label>
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => handleMonthChange(e)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
              </div>

              {/* Range Datas (Opcional, sobrescreve o mês se usado) */}
              <div className="sm:col-span-2 flex gap-2">
                  <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">De</label>
                      <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Até</label>
                      <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
              </div>
          </div>

          <div className="flex gap-2">
              <button 
                onClick={() => generatePDF(false)}
                disabled={isGeneratingPdf || orders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                  {isGeneratingPdf ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                  PDF
              </button>
              <button 
                onClick={() => generatePDF(true)}
                disabled={isGeneratingPdf || orders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                  <Share2 size={16} />
                  Compartilhar
              </button>
          </div>
      </div>

      {/* --- Cards Resumo --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Vendas Totais (Fechadas)</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ {totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={24}/></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Comissão Total</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">R$ {totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={24}/></div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-slate-500">Média de Comissão</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgRate.toFixed(2)}%</h3>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={24}/></div>
          </div>
      </div>

      {/* --- Tabela --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-medium tracking-wider border-b border-slate-200">
                          <tr>
                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4">Pedido</th>
                              <th className="px-6 py-4">Cliente</th>
                              <th className="px-6 py-4">Vendedor</th> {/* Nova Coluna */}
                              <th className="px-6 py-4">Indústria</th>
                              <th className="px-6 py-4 text-right">Venda Total</th>
                              <th className="px-6 py-4 text-right">Comissão</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {orders.length === 0 && (
                              <tr>
                                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                      Nenhum pedido fechado encontrado neste período.
                                  </td>
                              </tr>
                          )}
                          {orders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                                      {new Date(order.date).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-900">
                                      #{order.number}
                                  </td>
                                  <td className="px-6 py-4 text-slate-900 font-medium">
                                      {order.client?.fantasy_name || order.client?.name}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600 text-xs">
                                      {order.salesperson?.full_name || <span className="italic text-slate-400">Não def.</span>}
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">
                                      {order.industry?.nome_fantasia}
                                  </td>
                                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                                      R$ {order.total_value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                      R$ {order.calculated_commission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold text-slate-800">
                          <tr>
                              <td colSpan={5} className="px-6 py-4 text-right">TOTAIS:</td>
                              <td className="px-6 py-4 text-right">R$ {totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                              <td className="px-6 py-4 text-right text-emerald-700">R$ {totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          </tr>
                      </tfoot>
                  </table>
              </div>
          )}
      </div>
    </div>
  );
};

export default Commissions;