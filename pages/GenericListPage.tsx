import React from 'react';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface GenericListProps<T> {
  title: string;
  subtitle: string;
  data: T[];
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  addButtonLabel: string;
}

const GenericListPage = <T extends { id: string }>({ 
  title, 
  subtitle, 
  data, 
  columns, 
  onAdd, 
  onEdit, 
  onDelete,
  addButtonLabel 
}: GenericListProps<T>) => {
  
  const renderCell = (item: T, col: Column<T>) => {
    if (typeof col.accessor === 'function') {
      return col.accessor(item);
    }
    
    const value = item[col.accessor];
    
    // Se o valor for um objeto (como um join do Supabase) e não for um elemento React válido
    // transformamos em string para evitar erro #31
    if (value !== null && typeof value === 'object' && !React.isValidElement(value)) {
       return JSON.stringify(value);
    }
    
    return value as React.ReactNode;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 mt-1">{subtitle}</p>
        </div>
        <button 
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={20} />
          {addButtonLabel}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium tracking-wider border-b border-slate-200">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-6 py-4 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-6 py-4 whitespace-nowrap ${col.className || 'text-slate-700'}`}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Mostrando 1 a {data.length} de {data.length} registros</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 disabled:opacity-50" disabled>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericListPage;