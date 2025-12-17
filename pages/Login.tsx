import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  Building2, 
  UserPlus, 
  CheckCircle2, 
  ArrowRight,
  UserCheck,
  User,
  Smartphone
} from 'lucide-react';

type LoginMode = 'login' | 'first_access' | 'new_company' | 'update_password';

const Login = () => {
  const [mode, setMode] = useState<LoginMode>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // New Company & First Access Specifics
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  // UI States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Verifica se o usuário chegou via link de recuperação de senha (Hash na URL)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update_password');
      }
    });
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleTabChange = (newMode: LoginMode) => {
    clearMessages();
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    // Clear optional fields when switching context
    if (newMode === 'login') {
       setFullName('');
       setPhone('');
    }
  };

  // Helper de Máscara de Telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setPhone(value.substring(0, 15)); // Limita tamanho (11) 99999-9999
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError('Email ou senha incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      setIsSubmitting(false);
      return;
    }

    try {
      await authService.signUpNewCompany(email.trim().toLowerCase(), password, fullName, companyName);
      setSuccessMsg("Empresa cadastrada com sucesso! Verifique seu email para confirmar a conta antes de entrar.");
      setTimeout(() => setMode('login'), 5000);
    } catch (err: any) {
      setError(err.message || 'Falha ao criar conta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LÓGICA CORRIGIDA: SIGN UP DE VENDEDOR CONVIDADO ---
  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Normalização do Email
      const emailToSend = email.trim().toLowerCase();

      // 2. Criar usuário no Auth com Metadados
      // NOTA: Se o usuário já existir no perfil (criado pelo Admin), 
      // a Trigger no banco vai pegar esses metadados (Nome/Telefone) e atualizar o perfil existente.
      const { data, error } = await supabase.auth.signUp({
        email: emailToSend,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone // Salva telefone nos metadados também
          }
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
         // Login imediato
         navigate('/');
      } else if (data.user && !data.session) {
         setSuccessMsg("Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro antes de entrar.");
      } else {
         setError("Erro ao criar conta. Tente novamente.");
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.updatePassword(password);
      setSuccessMsg("Senha definida com sucesso! Entrando...");
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar nova senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
          <span className="text-3xl font-bold text-white tracking-tighter">PV</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">ProVendas <span className="text-indigo-600">SaaS</span></h1>
        <p className="text-slate-500 mt-2">Sistema Integrado de Gestão Comercial</p>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Tabs Header */}
        {mode !== 'update_password' && (
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${mode === 'login' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange('first_access')}
              className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${mode === 'first_access' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Primeiro Acesso
            </button>
            <button
              onClick={() => handleTabChange('new_company')}
              className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${mode === 'new_company' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Nova Empresa
            </button>
          </div>
        )}

        <div className="p-8">
          
          {/* Header Title based on Mode */}
          <div className="mb-6">
            {mode === 'login' && (
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <LogIn className="text-indigo-600" size={24} /> Acessar Conta
              </h2>
            )}
            {mode === 'first_access' && (
              <>
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <UserCheck className="text-indigo-600" size={24} /> Ativar Conta
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Confirme seus dados para ativar o acesso liberado pela empresa.
                </p>
              </>
            )}
            {mode === 'new_company' && (
              <>
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="text-indigo-600" size={24} /> Criar Conta Empresarial
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Experimente o ProVendas para sua empresa.
                </p>
              </>
            )}
             {mode === 'update_password' && (
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Lock className="text-indigo-600" size={24} /> Definir Nova Senha
              </h2>
            )}
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm animate-fadeIn">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3 text-green-700 text-sm animate-fadeIn">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Forms */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="voce@empresa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  <button type="button" onClick={async () => {
                      if(!email) { setError('Digite seu e-mail para recuperar a senha.'); return; }
                      try {
                          await authService.resetPasswordForEmail(email);
                          setSuccessMsg('Email de recuperação enviado!');
                      } catch(e:any) { setError(e.message); }
                  }} className="text-xs text-indigo-600 hover:text-indigo-700">Esqueceu a senha?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-slate-200 mt-2"
              >
                {isSubmitting ? 'Verificando...' : 'Entrar no Sistema'}
              </button>
            </form>
          )}

          {mode === 'new_company' && (
            <form onSubmit={handleNewCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Ex: Comercial Silva Ltda"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Administrador</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-indigo-200 mt-2"
              >
                {isSubmitting ? 'Criando Conta...' : 'Cadastrar Empresa'}
              </button>
            </form>
          )}

          {/* PRIMEIRO ACESSO - AGORA COM CRIAÇÃO DE SENHA (SIGN UP) */}
          {mode === 'first_access' && (
             <form onSubmit={handleFirstAccess} className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800 mb-4">
                Confirme seus dados para ativar o acesso liberado pela empresa.
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seu Email Cadastrado</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="(00) 90000-0000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Crie sua Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirme a Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-slate-200 mt-2"
              >
                {isSubmitting ? 'Criando Conta...' : (
                  <>
                    <UserPlus size={18} /> Criar Conta e Entrar
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'update_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
               <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800 mb-4">
                Crie uma senha forte para proteger sua conta.
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-green-200 mt-2"
              >
                {isSubmitting ? 'Salvando...' : 'Definir Senha e Entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Nexus Sales Manager. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default Login;