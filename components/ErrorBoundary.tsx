import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Inheriting from React.Component directly ensures TypeScript correctly recognizes inherited members like 'this.props' and 'this.state'.
export class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Explicitly initialize state property to help with TypeScript type inference.
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 mb-6">
              Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
            </p>
            
            <div className="bg-slate-100 text-slate-600 p-4 rounded-lg overflow-auto text-xs font-mono mb-6 text-left max-h-40 border border-slate-200">
              {this.state.error?.toString() || "Erro desconhecido"}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              <RefreshCw size={18} /> Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    // Fix: Accessing this.props.children from the inherited React.Component base class.
    return this.props.children;
  }
}
