console.log('🚀 main.jsx: SCRIPT LOADING - Very first line of main.jsx');

import React from 'react';
console.log('🚀 main.jsx: React imported');

import ReactDOM from 'react-dom/client';
console.log('🚀 main.jsx: ReactDOM imported');

import App from './App.jsx';
console.log('🚀 main.jsx: App component imported');

import './index.css';
console.log('🚀 main.jsx: CSS imported');

console.log('🚀 main.jsx: Starting React app...');
console.log('🚀 main.jsx: Document ready state:', document.readyState);
console.log('🚀 main.jsx: Root element:', document.getElementById('root'));
console.log('🚀 main.jsx: Current URL:', window.location.href);
console.log('🚀 main.jsx: Running in Ecwid admin:', window.location.href.includes('ecwid.com'));
console.log('🚀 main.jsx: Parent window:', window.parent !== window);

// Add error boundary for Ecwid admin panel environment
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 React Error Boundary caught error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>App Error</h2>
        <p>There was an error loading the app. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  return children;
};

try {
  console.log('🚀 main.jsx: Attempting to create React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  console.log('🚀 main.jsx: Rendering React app...');
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  console.log('🚀 main.jsx: React app rendered successfully!');
} catch (error) {
  console.error('🚨 main.jsx: Failed to render React app:', error);
  
  // Fallback: render a simple error message
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>App Loading Error</h2>
        <p>Failed to load the React app. This might be due to conflicts with Ecwid's admin panel.</p>
        <p>Error: ${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px;">
          Refresh Page
        </button>
      </div>
    `;
  }
}
