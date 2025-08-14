import React, { useState, useRef } from "react";
import { analyzeTextForCredentials, getAvailableAIModels } from "../services/aiServices";

const TextAnalyzer = ({ onCredentialsDetected, clientInfo }) => {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [analysisOptions, setAnalysisOptions] = useState({
    confidenceThreshold: 0.7,
    includeContext: true
  });
  const [parsedData, setParsedData] = useState({
    ftpAccounts: [],
    websitesToMigrate: [],
    domainsToDelegrate: [],
    emailAccounts: []
  });
  const textAreaRef = useRef(null);

  // Fetch available AI models on component mount
  React.useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await getAvailableAIModels();
        setModels(availableModels);
        
        // Select default model
        const defaultModel = availableModels.find(model => model.isDefault) || availableModels[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
        }
      } catch (err) {
        console.error("Błąd podczas pobierania modeli AI:", err);
      }
    };

    fetchModels();
  }, []);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    if (error) setError(null);
  };

  const handleOptionChange = (name, value) => {
    setAnalysisOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearText = () => {
    setInputText("");
    setError(null);
    setParsedData({
      ftpAccounts: [],
      websitesToMigrate: [],
      domainsToDelegrate: [],
      emailAccounts: []
    });
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };

  const parseTextManually = (text) => {
    const result = {
      ftpAccounts: [],
      websitesToMigrate: [],
      domainsToDelegrate: [],
      emailAccounts: []
    };

    // Parse FTP accounts
    const ftpRegex = /(?:serwer(?:a)?\s*FTP|adres\s*FTP):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let ftpMatch;
    while ((ftpMatch = ftpRegex.exec(text)) !== null) {
      result.ftpAccounts.push({
        server: ftpMatch[1],
        username: findNearby(text, ftpMatch.index, /(?:nazwa\s*użytkownika|użytkownik|login|username):\s*([a-zA-Z0-9._-]+)/i),
        password: findNearby(text, ftpMatch.index, /(?:hasło|haslo|password):\s*([^\s,;]+)/i)
      });
    }

    // Parse websites to migrate
    const websiteRegex = /(?:strony|stron(?:y|ę))(?:\s*internetow(?:ej|ą))?(?:\s*www)?(?:\s+|\s*:\s*)?(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;]*)/gi;
    let websiteMatch;
    while ((websiteMatch = websiteRegex.exec(text)) !== null) {
      result.websitesToMigrate.push(websiteMatch[1]);
    }

    // Parse domains to delegate
    const dnsServersRegex = /(?:serwer(?:y|ów)\s*DNS|DNS)(?:[^:]*?):?\s*(?:\n|.)+?(?:ns1|ns2)/i;
    const nsMatch = dnsServersRegex.exec(text);
    
    if (nsMatch) {
      const nsBlock = text.substring(nsMatch.index, nsMatch.index + 300); // Look at next 300 chars
      const nsRegex = /ns[0-9]\.([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      let nsServerMatch;
      const nsServers = [];
      
      while ((nsServerMatch = nsRegex.exec(nsBlock)) !== null) {
        nsServers.push(nsServerMatch[0]);
      }
      
      // Extract domains from websites or explicitly mentioned domains
      const domainRegex = /(?:domen(?:y|ę)|domain)(?:\s+|\s*:\s*)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      let domainMatch;
      
      // If domains explicitly listed
      while ((domainMatch = domainRegex.exec(text)) !== null) {
        result.domainsToDelegrate.push({
          domain: domainMatch[1],
          nameservers: nsServers
        });
      }
      
      // Also extract domains from website URLs if no explicit domains
      if (result.domainsToDelegrate.length === 0 && result.websitesToMigrate.length > 0) {
        result.websitesToMigrate.forEach(website => {
          try {
            const url = new URL(website);
            const domain = url.hostname;
            
            // Only add if not already in the list
            if (!result.domainsToDelegrate.some(d => d.domain === domain)) {
              result.domainsToDelegrate.push({
                domain: domain,
                nameservers: nsServers
              });
            }
          } catch (e) {
            // Invalid URL, skip
          }
        });
      }
    }

    // Parse email accounts
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let emailMatch;
    while ((emailMatch = emailRegex.exec(text)) !== null) {
      const email = emailMatch[1];
      // Skip emails that look like they're part of login credentials
      if (!text.substring(Math.max(0, emailMatch.index - 20), emailMatch.index).includes("login") &&
          !text.substring(Math.max(0, emailMatch.index - 20), emailMatch.index).includes("user")) {
        
        const password = findNearby(text, emailMatch.index, /(?:hasło|haslo|password):\s*([^\s,;]+)/i);
        
        result.emailAccounts.push({
          email: email,
          password: password,
          imapServer: findNearby(text, emailMatch.index, /(?:IMAP|poczty\s*przychodzące):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i),
          smtpServer: findNearby(text, emailMatch.index, /(?:SMTP|poczty\s*wychodząc):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
        });
      }
    }

    // Look for email configuration section
    const emailConfigRegex = /(?:dane|konfiguracja)\s+(?:do\s+)?(?:poczty|klient(?:a|ów)\s+pocztow)/i;
    const configMatch = emailConfigRegex.exec(text);
    
    if (configMatch) {
      const configSection = text.substring(configMatch.index, configMatch.index + 500);
      const serverRegex = /(?:serwer\s+(?:poczty|pocztowy)|mail\s+server)(?:\s+(?:wychodząc(?:ej|a)|przychodzac(?:ej|a))?)?(?:\s*(?:to|jest|:))?\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
      const serverMatch = serverRegex.exec(configSection);
      
      if (serverMatch) {
        const mailServer = serverMatch[1];
        
        // Update email accounts with server information if missing
        result.emailAccounts.forEach(account => {
          if (!account.imapServer) account.imapServer = mailServer;
          if (!account.smtpServer) account.smtpServer = mailServer;
        });
        
        // Extract port information
        const imapPortRegex = /(?:port\s+IMAP|IMAP[^:]*?port):\s*(\d+)/i;
        const smtpPortRegex = /(?:port\s+SMTP|SMTP[^:]*?port):\s*(\d+)/i;
        const popPortRegex = /(?:port\s+POP|POP\d[^:]*?port):\s*(\d+)/i;
        
        const imapPortMatch = imapPortRegex.exec(configSection);
        const smtpPortMatch = smtpPortRegex.exec(configSection);
        const popPortMatch = popPortRegex.exec(configSection);
        
        // Add port information to all email accounts
        result.emailAccounts.forEach(account => {
          if (imapPortMatch) account.imapPort = imapPortMatch[1];
          if (smtpPortMatch) account.smtpPort = smtpPortMatch[1];
          if (popPortMatch) account.popPort = popPortMatch[1];
        });
      }
    }

    return result;
  };

  const findNearby = (text, position, regex, range = 300) => {
    // Look for a pattern within a certain range of the position
    const startPos = Math.max(0, position - range);
    const endPos = Math.min(text.length, position + range);
    const searchText = text.substring(startPos, endPos);
    
    const match = regex.exec(searchText);
    return match ? match[1] : null;
  };

  const handleAnalyzeClick = async () => {
    if (!inputText.trim()) {
      setError("Proszę wprowadzić tekst do analizy.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // First try to parse the text manually to extract structured information
      const parsedResults = parseTextManually(inputText);
      setParsedData(parsedResults);
      
      // Then use AI service to extract credentials
      const options = {
        ...analysisOptions,
        modelId: selectedModel,
        clientInfo
      };

      const detectedCredentials = await analyzeTextForCredentials(inputText, options);
      
      if (detectedCredentials && detectedCredentials.length > 0) {
        onCredentialsDetected(detectedCredentials);
      } else if (
        parsedResults.ftpAccounts.length === 0 && 
        parsedResults.websitesToMigrate.length === 0 && 
        parsedResults.domainsToDelegrate.length === 0 && 
        parsedResults.emailAccounts.length === 0
      ) {
        setError("Nie wykryto danych uwierzytelniających ani informacji o migracji w podanym tekście.");
      }
    } catch (err) {
      setError(`Błąd analizy: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderParsedData = () => {
    const { ftpAccounts, websitesToMigrate, domainsToDelegrate, emailAccounts } = parsedData;
    const hasData = ftpAccounts.length > 0 || websitesToMigrate.length > 0 || 
                   domainsToDelegrate.length > 0 || emailAccounts.length > 0;
    
    if (!hasData) return null;
    
    return (
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Wykryte dane do migracji</h3>
        
        {ftpAccounts.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Konta FTP</h4>
            <ul className="bg-white rounded-md p-3 shadow-sm">
              {ftpAccounts.map((account, index) => (
                <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                  <div className="font-medium">{account.server}</div>
                  {account.username && <div>Login: {account.username}</div>}
                  {account.password && (
                    <div className="flex items-center">
                      <span>Hasło: </span>
                      <span className="password-mask ml-1">••••••••</span>
                      <button 
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        onClick={() => alert(`Hasło: ${account.password}`)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {websitesToMigrate.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Strony do przeniesienia</h4>
            <ul className="bg-white rounded-md p-3 shadow-sm">
              {websitesToMigrate.map((website, index) => (
                <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                  <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {website}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {domainsToDelegrate.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Domeny do przeniesienia</h4>
            <ul className="bg-white rounded-md p-3 shadow-sm">
              {domainsToDelegrate.map((domain, index) => (
                <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                  <div className="font-medium">{domain.domain}</div>
                  {domain.nameservers && domain.nameservers.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Serwery NS: {domain.nameservers.join(", ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {emailAccounts.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-blue-700 mb-2">Konta email do migracji</h4>
            <ul className="bg-white rounded-md p-3 shadow-sm">
              {emailAccounts.map((account, index) => (
                <li key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                  <div className="font-medium">{account.email}</div>
                  {account.password && (
                    <div className="flex items-center">
                      <span>Hasło: </span>
                      <span className="password-mask ml-1">••••••••</span>
                      <button 
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        onClick={() => alert(`Hasło: ${account.password}`)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                      </button>
                    </div>
                  )}
                  {account.imapServer && (
                    <div className="text-sm">
                      IMAP: {account.imapServer} {account.imapPort ? `(Port: ${account.imapPort})` : ""}
                    </div>
                  )}
                  {account.smtpServer && (
                    <div className="text-sm">
                      SMTP: {account.smtpServer} {account.smtpPort ? `(Port: ${account.smtpPort})` : ""}
                    </div>
                  )}
                  {account.popPort && (
                    <div className="text-sm">
                      POP3 Port: {account.popPort}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Analizator tekstu</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              className="block appearance-none w-full bg-gray-50 border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isAnalyzing}
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <button
            onClick={clearText}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors flex items-center"
            disabled={!inputText || isAnalyzing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><line x1="216" y1="60" x2="40" y2="60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="20" x2="168" y2="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M200,60V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <span className="ml-1">Wyczyść</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-2">
          <label htmlFor="input-text" className="block text-sm font-medium text-gray-700">
            Wklej wiadomość od klienta zawierającą dane migracyjne
          </label>
          <div className="ml-auto text-xs text-gray-500">
            {inputText.length} znaków
          </div>
        </div>
        <textarea
          id="input-text"
          ref={textAreaRef}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Wklej tutaj wiadomość od klienta zawierającą dane logowania, FTP, domeny do przeniesienia..."
          value={inputText}
          onChange={handleTextChange}
          disabled={isAnalyzing}
        ></textarea>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M142.41,40.22l87.46,151.87C236,202.79,228.08,216,215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22C119.89,29.26,136.11,29.26,142.41,40.22Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="136" x2="128" y2="104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="176" r="16"/></svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {renderParsedData()}

      <div className="mb-6 bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Opcje analizy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <input
              id="include-context"
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={analysisOptions.includeContext}
              onChange={(e) => handleOptionChange("includeContext", e.target.checked)}
              disabled={isAnalyzing}
            />
            <label htmlFor="include-context" className="ml-2 block text-sm text-gray-700">
              Uwzględnij kontekst wiadomości
            </label>
          </div>

          <div>
            <label htmlFor="confidence" className="block text-sm text-gray-700 mb-1">
              Próg pewności: {analysisOptions.confidenceThreshold}
            </label>
            <input
              id="confidence"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              value={analysisOptions.confidenceThreshold}
              onChange={(e) => handleOptionChange("confidenceThreshold", parseFloat(e.target.value))}
              disabled={isAnalyzing}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.1</span>
              <span>1.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing || !inputText.trim()}
          className={`px-6 py-3 rounded-md text-white font-medium flex items-center ${
            isAnalyzing || !inputText.trim()
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 transition-colors"
          }`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analizowanie...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><line x1="80" y1="112" x2="144" y2="112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="112" cy="112" r="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="168.57" y1="168.57" x2="224" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="112" y1="80" x2="112" y2="144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
              <span className="ml-2">Analizuj tekst</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>System automatycznie analizuje tekst w celu wykrycia danych migracyjnych i uwierzytelniających. Nie przechowuje wiadomości klientów po zakończeniu analizy.</p>
      </div>
    </div>
  );
};

export default TextAnalyzer;