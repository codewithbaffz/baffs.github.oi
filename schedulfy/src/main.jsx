import ReactDOM from 'react-dom/client';


import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  
  <React.StrictMode>
    <BrowserRouter 
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
    >
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
  
);