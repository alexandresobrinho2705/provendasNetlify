
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, ShoppingBag, DollarSign, Clock, ArrowRight, Loader2, Database, CheckCircle2, RefreshCw } from 'lucide-react';
import { StatCardProps, Order } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { SUPABASE_SCHEMA_SQL } from '../services/schema';

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-600'} flex items-center`}>
          {trendUp ? '+' : ''}{trend}
        </span>
        <span className="text-slate-400 ml-2">vs mês anterior</span>
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSqlSuccess, setShowSqlSuccess] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Stats State
  const [totalSales, setTotalSales] = useState(0);
  const [openQuotes, setOpenQuotes] = useState(0);
  const [ordersThisMonth, setOrdersThisMonth] = useState(0);
  const [newClientsCount, setNewClientsCount] = useState(0);
  
  // Chart & List State
  const [chartData, setChartData] = useState<{name: string, vendas: number}[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [user]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL).then(() => {
      setShowSqlSuccess(true);
      setTimeout(() => setShowSqlSuccess(false), 3000);
    });
  };

  const fetchDashboardData = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    // Timeout de segurança (15s)
    const timeoutId = setTimeout(() => {
        if (isLoading) {
            setIsLoading(false);
            setError("O carregamento demorou muito. Verifique sua conexão.");
        }
    }, 15000);

    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // 1. Vendas Totais (Status Fechado) para o Gráfico
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('total_value, total_ipi, date, status')
        .gte('date', sixMonthsAgo.toISOString())
        .eq('status', 'Fechado')
        .abortSignal(abortControllerRef.current.signal);

      if (salesError) throw salesError;

      // Calcular Total Geral (Ano Corrente) - APENAS FECHADOS
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const { data: yearSales, error: yearError } = await supabase
        .from('orders')
        .select('total_value, total_ipi')
        .gte('date', startOfYear)
        .eq('status', 'Fechado')
        .abortSignal(abortControllerRef.current.signal);
      
      if (yearError) throw yearError;

      const totalValueYear = yearSales?.reduce((acc, curr) => acc + (curr.total_value || 0) + (curr.total_ipi || 0), 0) || 0;
      setTotalSales(totalValueYear);

      // Calcular Pedidos Mês Atual (Qualquer status exceto cancelado)
      const { count: ordersCount, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('date', firstDayOfMonth)
        .neq('status', 'Cancelado')
        .abortSignal(abortControllerRef.current.signal);
      
      if (countError) throw countError;
      setOrdersThisMonth(ordersCount || 0);

      // 2. Orçamentos Abertos
      const { count: quotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Em Aberto')
        .abortSignal(abortControllerRef.current.signal);
      setOpenQuotes(quotesCount || 0);

      // 3. Novos Clientes Mês
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth)
        .abortSignal(abortControllerRef.current.signal);
      setNewClientsCount(clientsCount || 0);

      // 4. Processar Gráfico
      const graphData = [];
      const safeSalesData = salesData || [];

      for (let i = 5; i >= 0; i--) {
         const d = new Date();
         d.setMonth(d.getMonth() - i);
         const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
         const monthNum = d.getMonth();
         const yearNum = d.getFullYear();

         const monthTotal = safeSalesData
            .filter(o => {
                const oDate = new Date(o.date);
                return oDate.getMonth() === monthNum && oDate.getFullYear() === yearNum;
            })
            .reduce((acc, curr) => acc + (curr.total_value || 0) + (curr.total_ipi || 0), 0) || 0;
         
         graphData.push({ name: monthName.charAt(0).toUpperCase() + monthName.slice(1), vendas: monthTotal });
      }
      setChartData(graphData);

      // 5. Atividade Recente
      const { data: recentData } = await supabase
        .from('orders')
        .select(`
          id, 
          number, 
          date, 
          status, 
          total_value, 
          total_ipi,
          client:clients(name, fantasy_name)
        `)
        .order('date', { ascending: false })
        .limit(5)
        .abortSignal(abortControllerRef.current.signal);
        
      setRecentActivity(recentData || []);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
          console.error('Erro ao carregar dashboard:', error);
          setError("Erro ao carregar dados. Tente novamente.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-slate-500 text-sm">Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ops!</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <button 
                onClick={fetchDashboardData}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                  <RefreshCw size={18} /> Tentar Novamente
              </button>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      {/* Header com Botão SQL */}
      <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 hidden sm:block">Visão Geral</h2>
          <button 
             onClick={handleCopySql}
             className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-sm font-medium text-sm ml-auto"
             title="Copiar Script SQL para corrigir banco de dados"
           >
             {showSqlSuccess ? <CheckCircle2 size={18} className="text-green-400" /> : <Database size={18} />}
             <span className="">Atualizar Banco de Dados</span>
          </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas (Ano Atual)" 
          value={`R$ ${totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          trend="" 
          trendUp={true} 
          icon={DollarSign} 
          color="bg-indigo-500"
        />
        <StatCard 
          title="Orçamentos Abertos" 
          value={openQuotes.toString()} 
          trend="" 
          trendUp={true} 
          icon={Clock} 
          color="bg-orange-500"
        />
        <StatCard 
          title="Pedidos no Mês" 
          value={ordersThisMonth.toString()} 
          trend="" 
          trendUp={false} 
          icon={ShoppingBag} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Novos Clientes" 
          value={newClientsCount.toString()} 
          trend="" 
          trendUp={true} 
          icon={Users} 
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Desempenho de Vendas</h3>
            <select className="text-sm border-slate-200 rounded-lg text-slate-500 focus:ring-indigo-500 outline-none">
              <option>Últimos 6 meses</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Vendas']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Pedidos Recentes</h3>
          <div className="space-y-6">
            {recentActivity.length === 0 && <p className="text-slate-400 text-sm">Nenhum pedido recente.</p>}
            {recentActivity.map((order) => (
              <div key={order.id} className="flex items-center gap-4">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${order.status === 'Finalizado' || order.status === 'Fechado' ? 'bg-green-100 text-green-600' : 
                    order.status === 'Em Aberto' ? 'bg-yellow-100 text-yellow-600' : 
                    order.status === 'Cancelado' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-500'}
                `}>
                  <ShoppingBag size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{order.client?.fantasy_name || order.client?.name}</p>
                  <p className="text-xs text-slate-500">Pedido #{order.number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">R$ {((order.total_value || 0) + (order.total_ipi || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="/#/orders" className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2">
            Ver Todos os Pedidos <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
