import { Client, Product, Order, OrderItem } from '../types';

export const MOCK_CLIENTS: Client[] = [
  { 
    id: '1', 
    type: 'PJ',
    status: 'Ativo',
    document: '12.345.678/0001-90',
    ie: '123.456.789.111',
    name: 'Comércio Silva LTDA',
    fantasy_name: 'Comércio Silva',
    general_contact_name: 'João Silva',
    email: 'joao@empresaA.com', 
    phone: '(11) 3333-0000',
    cellphone: '(11) 99999-0000',
    cep: '01001-000',
    address: 'Praça da Sé',
    number: '100',
    neighborhood: 'Sé',
    city: 'São Paulo', 
    state: 'SP',
    buyer1_name: 'Roberto',
    buyer1_email: 'compras@silva.com',
    buyer1_whatsapp: '(11) 98888-7777'
  },
  { 
    id: '2', 
    type: 'PJ',
    status: 'Ativo',
    document: '98.765.432/0001-10',
    ie: 'Isento',
    name: 'Tech Solutions SA', 
    fantasy_name: 'TechSol',
    email: 'maria@techsol.com', 
    phone: '(21) 3333-1111', 
    cellphone: '(21) 98888-1111', 
    cep: '20040-002',
    address: 'Av Rio Branco',
    number: '500',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro', 
    state: 'RJ' 
  },
  { 
    id: '3', 
    type: 'PF',
    status: 'Inativo',
    document: '123.456.789-00',
    name: 'Carlos Oliveira', 
    email: 'carlos@gmail.com', 
    cellphone: '(31) 97777-2222', 
    cep: '30130-000',
    address: 'Av Afonso Pena',
    number: '1000',
    neighborhood: 'Centro',
    city: 'Belo Horizonte', 
    state: 'MG' 
  },
  { 
    id: '4', 
    type: 'PJ',
    status: 'Em Prospecção',
    document: '44.555.666/0001-22',
    name: 'Ana Pereira Comércio',
    fantasy_name: 'Mega Varejo', 
    email: 'ana@varejo.com', 
    cellphone: '(41) 96666-3333', 
    cep: '80000-000',
    address: 'Rua XV de Novembro',
    number: '200',
    neighborhood: 'Centro',
    city: 'Curitiba', 
    state: 'PR' 
  },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: '101', cod: 'PRD-001', name: 'Smartphone Pro Max', price: 4500.00, ipi: 15, industry_id: 'ind-01' },
  { id: '102', cod: 'PRD-002', name: 'Notebook Ultra Slim', price: 3200.00, ipi: 10, industry_id: 'ind-01' },
  { id: '103', cod: 'PRD-003', name: 'Monitor 4K 27"', price: 1800.00, ipi: 10, industry_id: 'ind-01' },
  { id: '104', cod: 'PRD-004', name: 'Cadeira Ergonômica', price: 850.00, ipi: 5, industry_id: 'ind-02' },
  { id: '105', cod: 'PRD-005', name: 'Teclado Mecânico', price: 350.00, ipi: 12, industry_id: 'ind-02' },
];

// Helper Item for Mocks
const dummyItem: OrderItem = {
    product_id: '101', product_code: 'P01', product_name: 'Produto Mock', 
    quantity: 1, unit_price: 100, total_price: 100, commission_rate: 5
};

export const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-2023-001', 
    number: 2023001,
    date: '2023-10-25', 
    total_value: 12500.00, 
    status: 'Finalizado', 
    client_id: '1',
    industry_id: 'ind-01',
    commission_type: 'GLOBAL',
    global_commission_rate: 5,
    client: { name: 'Comércio Silva LTDA', fantasy_name: 'Comércio Silva' } as Client,
    items: Array(12).fill(dummyItem)
  },
  { 
    id: 'ORD-2023-002', 
    number: 2023002,
    date: '2023-10-26', 
    total_value: 4500.00, 
    status: 'Em Aberto', 
    client_id: '2',
    industry_id: 'ind-01',
    commission_type: 'GLOBAL',
    global_commission_rate: 5,
    client: { name: 'Tech Solutions SA', fantasy_name: 'Tech Solutions' } as Client,
    items: Array(3).fill(dummyItem)
  },
  { 
    id: 'ORD-2023-003', 
    number: 2023003,
    date: '2023-10-27', 
    total_value: 890.00, 
    status: 'Em Aberto', 
    client_id: '4',
    industry_id: 'ind-01',
    commission_type: 'GLOBAL',
    global_commission_rate: 5,
    client: { name: 'Ana Pereira Comércio', fantasy_name: 'Mega Varejo' } as Client,
    items: Array(5).fill(dummyItem)
  },
  { 
    id: 'ORD-2023-004', 
    number: 2023004,
    date: '2023-10-27', 
    total_value: 15200.00, 
    status: 'Finalizado', 
    client_id: '5',
    industry_id: 'ind-01',
    commission_type: 'GLOBAL',
    global_commission_rate: 5,
    client: { name: 'Sul Logística', fantasy_name: 'Sul Logística' } as Client,
    items: Array(25).fill(dummyItem)
  },
  { 
    id: 'ORD-2023-005', 
    number: 2023005,
    date: '2023-10-28', 
    total_value: 3200.00, 
    status: 'Cancelado', 
    client_id: '3',
    industry_id: 'ind-01',
    commission_type: 'GLOBAL',
    global_commission_rate: 5,
    client: { name: 'Carlos Oliveira', fantasy_name: 'Oliveira Construções' } as Client,
    items: Array(1).fill(dummyItem)
  },
];