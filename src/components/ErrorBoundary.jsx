import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message || error.toString() };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Check if it's a ChunkLoadError (very common on Vercel after deployments)
    if (
      error.name === 'ChunkLoadError' ||
      (error.message && error.message.includes('Loading chunk')) ||
      (error.message && error.message.includes('dynamically imported module'))
    ) {
      // Force a full page reload to fetch the new chunks
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="text-center max-w-md break-words">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Une petite erreur est survenue</h2>
            <p className="text-gray-500 mb-2">Message d'erreur pour débogage :</p>
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-xs text-left mb-6 font-mono border border-red-200">
              {this.state.errorMessage}
            </div>
            <button 
              onClick={() => {
                // Clear localStorage in case of corrupt state
                // localStorage.clear();
                window.location.reload();
              }}
              className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
