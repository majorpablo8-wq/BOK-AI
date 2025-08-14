import React, { useState, useEffect } from "react";
import TextAnalyzer from "./components/TextAnalyzer";
import CredentialsList from "./components/CredentialsList";
import { updateAnalysisParameters } from "./services/aiServices";

const App = () => {
  const [credentials, setCredentials] = useState([]);
  const [activeTab, setActiveTab] = useState("analyzer");
  const [clientInfo, setClientInfo] = useState({
    name: "",
    id: "",
    ticketId: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Simulate loading app resources
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle credentials detected from analyzer
  const handleCredentialsDetected = (detectedCredentials) => {
    // Add client info and timestamp to each credential
    const enrichedCredentials = detectedCredentials.map(cred => ({
      ...cred,
      clientName: clientInfo.name || "Nieznany Klient",
      clientId: clientInfo.id || null,
      ticketId: clientInfo.ticketId || null,
      dateExtracted: new Date().toISOString()
    }));
    
    setCredentials(prevCredentials => [...prevCredentials, ...enrichedCredentials]);
    
    // Show notification
    setNotification({
      type: "success",
      message: `Wykryto ${detectedCredentials.length} ${detectedCredentials.length === 1 ? "dane uwierzytelniające" : "danych uwierzytelniających"}.`
    });
    
    // Switch to credentials list tab
    setActiveTab("credentials");
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle client info changes
  const handleClientInfoChange = (e) => {
    const { name, value } = e.target;
    setClientInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));
  };

  // Clear all credentials
  const clearAllCredentials = () => {
    if (window.confirm("Czy na pewno chcesz usunąć wszystkie wykryte dane uwierzytelniające?")) {
      setCredentials([]);
      setNotification({
        type: "info",
        message: "Wszystkie dane uwierzytelniające zostały usunięte."
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  // Update AI analysis settings
  const updateAISettings = async (settings) => {
    try {
      setIsLoading(true);
      await updateAnalysisParameters(settings);
      setNotification({
        type: "success",
        message: "Ustawienia analizy AI zostały zaktualizowane."
      });
    } catch (error) {
      setNotification({
        type: "error",
        message: `Błąd aktualizacji ustawień: ${error.message}`
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie aplikacji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="28" height="28"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="96" r="16"/><circle cx="128" cy="160" r="16"/></svg>
              <h1 className="ml-2 text-xl font-bold text-blue-800">
                BOK AI Analyzer
              </h1>
            </div>
            <div>
              <button
                onClick={() => clearAllCredentials()}
                className="text-gray-600 hover:text-red-600 font-medium"
                disabled={credentials.length === 0}
              >
                Wyczyść wszystkie dane
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client info form */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informacje o zgłoszeniu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa klienta
              </label>
              <input
                type="text"
                id="client-name"
                name="name"
                value={clientInfo.name}
                onChange={handleClientInfoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nazwa firmy lub klienta"
              />
            </div>
            <div>
              <label htmlFor="client-id" className="block text-sm font-medium text-gray-700 mb-1">
                ID klienta
              </label>
              <input
                type="text"
                id="client-id"
                name="id"
                value={clientInfo.id}
                onChange={handleClientInfoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Numer ID klienta w systemie"
              />
            </div>
            <div>
              <label htmlFor="ticket-id" className="block text-sm font-medium text-gray-700 mb-1">
                Numer zgłoszenia
              </label>
              <input
                type="text"
                id="ticket-id"
                name="ticketId"
                value={clientInfo.ticketId}
                onChange={handleClientInfoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="np. TICKET-12345"
              />
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div 
            className={`mb-6 p-4 rounded-md ${
              notification.type === "success" ? "bg-green-50 border border-green-200 text-green-700" :
              notification.type === "error" ? "bg-red-50 border border-red-200 text-red-700" :
              "bg-blue-50 border border-blue-200 text-blue-700"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {notification.type === "success" && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><polyline points="88 136 112 160 168 104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                )}
                {notification.type === "error" && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
                )}
                {notification.type === "info" && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M152,80H112l-8,48a27.57,27.57,0,0,1,20-8,28,28,0,0,1,0,56,27.57,27.57,0,0,1-20-8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm">{notification.message}</p>
              </div>
              <div className="ml-auto">
                <button 
                  onClick={() => setNotification(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><rect x="88" y="88" width="80" height="80" rx="12"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "analyzer" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Analizator tekstu
            </button>
            <button
              onClick={() => setActiveTab("credentials")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "credentials"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Wykryte dane ({credentials.length})
            </button>
          </nav>
        </div>

        {/* Active tab content */}
        <div>
          {activeTab === "analyzer" && (
            <TextAnalyzer 
              onCredentialsDetected={handleCredentialsDetected} 
              clientInfo={clientInfo}
            />
          )}
          {activeTab === "credentials" && (
            <CredentialsList credentials={credentials} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <p>BOK AI Analyzer &copy; {new Date().getFullYear()} - Narzędzie wsparcia obsługi klienta</p>
            </div>
            <div>
              <span>Wersja 1.0.0</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;