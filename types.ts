import React from 'react';

export type QuoteStatus = 'Em Aberto' | 'Finalizado' | 'Aprovado';
export type OrderStatus = 'Em Aberto' | 'Cancelado' | 'Finalizado' | 'Fechado';
export type CommissionType = 'GLOBAL' | 'ITEM';

// Reusing QuoteItem logic for OrderItem mostly, but good to separate
export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate: number;
  item_observation?: string;
  // IPI Fields
  ipi_rate?: number;
  ipi_total?: number;
}

export interface Order {
  id: string;
  owner_id?: string;
  salesperson_id?: string; // Vendedor Responsável
  number: number; // Serial
  date: string;
  status: OrderStatus;
  
  client_id: string;
  industry_id: string;
  carrier_id?: string;
  quote_id?: string; // Origem
  
  total_value: number; // Valor dos Produtos (Sem IPI)
  total_ipi?: number; // Valor Total do IPI
  
  payment_term?: string;
  freight_type?: string;
  
  commission_type: CommissionType;
  global_commission_rate: number;
  
  delivery_address?: string;
  delivery_deadline?: string;
  observations?: string;

  created_at?: string;

  // Joined properties
  client?: Client;
  industry?: Industry;
  carrier?: Carrier;
  items?: OrderItem[];
  salesperson?: UserProfile; // Joined profile
}

// Mantendo Quote interface (igual)
export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate: number;
  item_observation?: string;
  // IPI Fields
  ipi_rate?: number;
  ipi_total?: number;
}

export interface Quote {
  id: string;
  owner_id?: string;
  salesperson_id?: string; // Vendedor Responsável
  number: number; 
  date: string;
  status: QuoteStatus;
  
  client_id: string;
  industry_id: string;
  carrier_id?: string;
  
  total_value: number; // Valor dos Produtos (Sem IPI)
  total_ipi?: number; // Valor Total do IPI

  payment_term?: string;
  freight_type?: string;
  
  commission_type: CommissionType;
  global_commission_rate: number;
  
  delivery_address?: string;
  delivery_deadline?: string;
  observations?: string;

  created_at?: string;

  client?: Client;
  industry?: Industry;
  carrier?: Carrier;
  items?: QuoteItem[];
  salesperson?: UserProfile; // Joined profile
}

export type UserRole = 'Admin' | 'Representante' | 'Vendedor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  allowed_routes?: string[]; // CUSTOM PERMISSIONS
  owner_id?: string; // ID da empresa (Admin) a qual este usuário pertence
}

export interface UserProfile {
  id: string;
  user_id?: string; // Link to auth.users
  owner_id?: string; // ID da empresa/admin a qual este usuário pertence
  full_name: string;
  email: string;
  cellphone: string;
  role: UserRole;
  allowed_routes?: string[]; // CUSTOM PERMISSIONS
  created_at?: string;
}

export type ClientType = 'PJ' | 'PF';
export type ClientStatus = 'Ativo' | 'Inativo' | 'Em Prospecção';

export interface Client {
  id: string;
  owner_id?: string; 
  type: ClientType;
  status: ClientStatus;
  segment?: string; 
  
  document: string; 
  ie?: string; 
  name: string; 
  fantasy_name?: string; 
  general_contact_name?: string; 

  email: string;
  phone?: string; 
  cellphone: string; 

  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;

  buyer1_name?: string;
  buyer1_email?: string;
  buyer1_whatsapp?: string;
  
  buyer2_name?: string;
  buyer2_email?: string;
  buyer2_whatsapp?: string;
}

export interface Industry {
  id: string;
  owner_id?: string;
  logo_url?: string;
  cnpj: string;
  ie?: string;
  razao_social: string;
  nome_fantasia: string;
  regime?: string;
  icms?: string;
  commission_rate?: number;

  phone?: string;
  whatsapp?: string;
  contact_name?: string;

  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;

  comm_mgr_name?: string;
  comm_mgr_email?: string;
  comm_mgr_cell?: string;

  fin_mgr_name?: string;
  fin_mgr_email?: string;
  fin_mgr_cell?: string;

  director_name?: string;
  director_email?: string;
  director_cell?: string;

  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_holder?: string;
  pix_key1?: string;
  pix_key2?: string;
  pix_key3?: string;
}

export interface Carrier {
  id: string;
  owner_id?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  ie?: string;
  
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;

  phone?: string;
  email?: string;
  cellphone?: string; 
  contact_name?: string;
}

export interface Product {
  id: string;
  owner_id?: string;
  cod: string; 
  name: string; 
  ipi: number; 
  price: number; 
  industry_id: string; 
  industry?: Industry; 
}

export interface Company {
  id?: string;
  owner_id: string;
  logo_url?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  ie: string;
  email: string;
  phone: string;
  website?: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  admin_name: string;
}

export interface SystemParameters {
  id?: string;
  owner_id?: string;
  freight_types: string[];
  segment_types: string[];
  payment_terms: string[];
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  // allowedRoles não é mais a única fonte da verdade, usaremos verificação dinâmica
  allowedRoles: UserRole[]; 
}

export interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  color: string;
}