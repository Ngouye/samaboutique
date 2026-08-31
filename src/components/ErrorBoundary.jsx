import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
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
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Une petite erreur est survenue</h2>
            <p className="text-gray-500 mb-6">Nous avons mis à jour l'application. Veuillez rafraîchir la page pour continuer.</p>
            <button 
              onClick={() => window.location.reload()}
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
