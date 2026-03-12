import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false, errorInfo: null }; 
  }
  static getDerivedStateFromError(error) { 
    return { hasError: true, errorInfo: error }; 
  }
  componentDidCatch(error, errorInfo) { 
    console.error("系統攔截異常：", error, errorInfo); 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center p-6">
          <div className="p-8 max-w-lg w-full text-red-600 font-bold bg-red-50 border-2 border-red-200 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <AlertCircle size={64} className="mb-4 animate-bounce" />
            <h3 className="text-2xl mb-2 font-black">系統異常攔截</h3>
            <div className="w-full bg-red-100 p-3 rounded text-xs text-red-800 font-mono overflow-auto max-h-32 mb-6 text-left">
              {this.state.errorInfo?.toString()}
            </div>
            <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-6 py-3 rounded-lg">
              清除暫存並重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
