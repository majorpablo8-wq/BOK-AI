import React, { useState } from "react";

const CredentialsList = ({ credentials }) => {
  const [selectedCredentials, setSelectedCredentials] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter credentials by type
  const ftpCredentials = credentials.filter(cred => cred.username && (cred.system?.toLowerCase().includes("ftp") || cred._type === "ftp"));
  const websiteCredentials = credentials.filter(cred => cred.system?.toLowerCase().includes("web") || cred._type === "website");
  const domainCredentials = credentials.filter(cred => cred.system?.toLowerCase().includes("domain") || cred._type === "domain");
  const emailCredentials = credentials.filter(cred => (cred.username?.includes("@") || cred.system?.toLowerCase().includes("email")) || cred._type === "email");
  
  // Handle checkbox selection for export
  const handleCheckboxChange = (credentialId) => {
    setSelectedCredentials(prevSelected => {
      if (prevSelected.includes(credentialId)) {
        return prevSelected.filter(id => id !== credentialId);
      } else {
        return [...prevSelected, credentialId];
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const currentlyVisibleCredentials = getCurrentTabCredentials().map((cred, index) => getCredentialId(cred, index));
      setSelectedCredentials(currentlyVisibleCredentials);
    } else {
      setSelectedCredentials([]);
    }
  };

  // Get a unique ID for a credential
  const getCredentialId = (credential, index) => {
    return `${credential._type || "credential"}-${index}`;
  };

  // Get credentials for the current tab
  const getCurrentTabCredentials = () => {
    switch (activeTab) {
      case "ftp":
        return ftpCredentials;
      case "websites":
        return websiteCredentials;
      case "domains":
        return domainCredentials;
      case "emails":
        return emailCredentials;
      default:
        return credentials;
    }
  };

  // Copy credential to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Visual feedback could be added here
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  // Export selected credentials to JSON file
  const exportToJson = () => {
    if (selectedCredentials.length === 0) {
      alert("Proszę wybrać przynajmniej jedno dane uwierzytelniające do eksportu.");
      return;
    }

    // Create a map of selected credential IDs for faster lookup
    const selectedMap = {};
    selectedCredentials.forEach(id => selectedMap[id] = true);
    
    // Prepare data structure for export
    const exportData = {
      ftpAccounts: [],
      websites: [],
      domains: [],
      emailAccounts: [],
      otherCredentials: []
    };
    
    // Group selected credentials by type
    credentials.forEach((credential, index) => {
      const credId = getCredentialId(credential, index);
      
      if (!selectedMap[credId]) return;
      
      if (credential._type === "ftp" || credential.system?.toLowerCase().includes("ftp")) {
        exportData.ftpAccounts.push({
          server: credential.server || credential.system,
          username: credential.username,
          password: credential.password,
          clientName: credential.clientName,
          dateExtracted: credential.dateExtracted
        });
      } else if (credential._type === "website" || credential.system?.toLowerCase().includes("web")) {
        exportData.websites.push({
          url: credential.url || credential.username,
          credentials: {
            username: credential.username,
            password: credential.password
          },
          clientName: credential.clientName,
          dateExtracted: credential.dateExtracted
        });
      } else if (credential._type === "domain" || credential.system?.toLowerCase().includes("domain")) {
        exportData.domains.push({
          domain: credential.domain || credential.username,
          nameservers: credential.nameservers || [],
          clientName: credential.clientName,
          dateExtracted: credential.dateExtracted
        });
      } else if (credential._type === "email" || credential.username?.includes("@") || credential.system?.toLowerCase().includes("email")) {
        exportData.emailAccounts.push({
          email: credential.email || credential.username,
          password: credential.password,
          server: credential.server || credential.system,
          imapSettings: credential.imapSettings,
          smtpSettings: credential.smtpSettings,
          clientName: credential.clientName,
          dateExtracted: credential.dateExtracted
        });
      } else {
        exportData.otherCredentials.push({
          username: credential.username,
          password: credential.password,
          system: credential.system,
          clientName: credential.clientName,
          dateExtracted: credential.dateExtracted
        });
      }
    });

    // Create and download the JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = href;
    link.download = `migration-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  // Render password field with visibility toggle
  const renderPassword = (password) => {
    return (
      <div className="flex items-center">
        <span className="password-mask">••••••••</span>
        <button 
          className="ml-2 text-blue-600 hover:text-blue-800"
          onClick={() => alert(`Hasło: ${password}`)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="128" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
        </button>
        <button 
          className="ml-1 text-gray-500 hover:text-gray-700"
          onClick={() => copyToClipboard(password)}
          title="Kopiuj hasło"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
        </button>
      </div>
    );
  };

  // Render FTP accounts table
  const renderFtpTable = () => {
    return (
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-12 px-4 py-2 text-left">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-2 text-left">Serwer FTP</th>
            <th className="px-4 py-2 text-left">Login</th>
            <th className="px-4 py-2 text-left">Hasło</th>
            <th className="px-4 py-2 text-left">Klient</th>
            <th className="px-4 py-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {ftpCredentials.map((credential, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedCredentials.includes(getCredentialId(credential, index))}
                  onChange={() => handleCheckboxChange(getCredentialId(credential, index))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {credential.server || credential.system || "Nieokreślony"}
              </td>
              <td className="px-4 py-2 border-t border-gray-200 font-medium">
                {credential.username}
                <button 
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard(credential.username)}
                  title="Kopiuj login"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </button>
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {renderPassword(credential.password)}
              </td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.clientName || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.dateExtracted || new Date().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Render websites table
  const renderWebsitesTable = () => {
    return (
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-12 px-4 py-2 text-left">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-2 text-left">Strona WWW</th>
            <th className="px-4 py-2 text-left">Login/Email</th>
            <th className="px-4 py-2 text-left">Hasło</th>
            <th className="px-4 py-2 text-left">Klient</th>
            <th className="px-4 py-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {websiteCredentials.map((credential, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedCredentials.includes(getCredentialId(credential, index))}
                  onChange={() => handleCheckboxChange(getCredentialId(credential, index))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                <a href={credential.url || "#"} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {credential.url || credential.system || "Nieokreślony"}
                </a>
              </td>
              <td className="px-4 py-2 border-t border-gray-200 font-medium">
                {credential.username}
                <button 
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard(credential.username)}
                  title="Kopiuj login"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </button>
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {renderPassword(credential.password)}
              </td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.clientName || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.dateExtracted || new Date().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Render domains table
  const renderDomainsTable = () => {
    return (
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-12 px-4 py-2 text-left">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-2 text-left">Domena</th>
            <th className="px-4 py-2 text-left">Serwery DNS</th>
            <th className="px-4 py-2 text-left">Klient</th>
            <th className="px-4 py-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {domainCredentials.map((credential, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedCredentials.includes(getCredentialId(credential, index))}
                  onChange={() => handleCheckboxChange(getCredentialId(credential, index))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-2 border-t border-gray-200 font-medium">
                {credential.domain || credential.username || "Nieokreślona"}
                <button 
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard(credential.domain || credential.username)}
                  title="Kopiuj domenę"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </button>
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {credential.nameservers && credential.nameservers.length > 0 
                  ? credential.nameservers.join(", ")
                  : "Brak danych"
                }
              </td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.clientName || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.dateExtracted || new Date().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Render email accounts table
  const renderEmailsTable = () => {
    return (
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-12 px-4 py-2 text-left">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Hasło</th>
            <th className="px-4 py-2 text-left">Serwer</th>
            <th className="px-4 py-2 text-left">Klient</th>
            <th className="px-4 py-2 text-left">Data</th>
          </tr>
        </thead>
        <tbody>
          {emailCredentials.map((credential, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedCredentials.includes(getCredentialId(credential, index))}
                  onChange={() => handleCheckboxChange(getCredentialId(credential, index))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-2 border-t border-gray-200 font-medium">
                {credential.email || credential.username}
                <button 
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard(credential.email || credential.username)}
                  title="Kopiuj email"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </button>
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {renderPassword(credential.password)}
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {credential.server || credential.imapSettings?.server || credential.smtpSettings?.server || "Nieokreślony"}
                {(credential.imapSettings?.port || credential.smtpSettings?.port) && (
                  <span className="text-xs text-gray-500 block">
                    {credential.imapSettings?.port && `IMAP: ${credential.imapSettings.port}`}
                    {credential.smtpSettings?.port && ` SMTP: ${credential.smtpSettings.port}`}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.clientName || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.dateExtracted || new Date().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Render default credentials table
  const renderAllCredentialsTable = () => {
    return (
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-12 px-4 py-2 text-left">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-2 text-left">Login/Email</th>
            <th className="px-4 py-2 text-left">Hasło</th>
            <th className="px-4 py-2 text-left">System</th>
            <th className="px-4 py-2 text-left">Klient</th>
            <th className="px-4 py-2 text-left">Nr Zgłoszenia</th>
            <th className="px-4 py-2 text-left">Data wykrycia</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((credential, index) => (
            <tr 
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedCredentials.includes(getCredentialId(credential, index))}
                  onChange={() => handleCheckboxChange(getCredentialId(credential, index))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-4 py-2 border-t border-gray-200 font-medium">
                {credential.username}
                <button 
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => copyToClipboard(credential.username)}
                  title="Kopiuj login"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="14" height="14"><rect width="256" height="256" fill="none"/><path d="M160,40h40a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M88,72V64a40,40,0,0,1,80,0v8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                </button>
              </td>
              <td className="px-4 py-2 border-t border-gray-200">
                {renderPassword(credential.password)}
              </td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.system || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.clientName || "Nieokreślony"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.ticketId || "-"}</td>
              <td className="px-4 py-2 border-t border-gray-200">{credential.dateExtracted || new Date().toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Wykryte dane do migracji
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={exportToJson}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
            disabled={selectedCredentials.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18"><rect width="256" height="256" fill="none"/><path d="M180,104h20a8,8,0,0,1,8,8v96a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V112a8,8,0,0,1,8-8H76" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="88 64 128 24 168 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="24" x2="128" y2="136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <span className="ml-2">Eksportuj do JSON</span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("all")}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === "all" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Wszystkie ({credentials.length})
            </button>
            <button
              onClick={() => setActiveTab("ftp")}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === "ftp" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Konta FTP ({ftpCredentials.length})
            </button>
            <button
              onClick={() => setActiveTab("websites")}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === "websites" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Strony WWW ({websiteCredentials.length})
            </button>
            <button
              onClick={() => setActiveTab("domains")}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === "domains" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Domeny ({domainCredentials.length})
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === "emails" 
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Konta email ({emailCredentials.length})
            </button>
          </nav>
        </div>
      </div>

      {credentials && credentials.length > 0 ? (
        <div className="overflow-x-auto">
          {activeTab === "ftp" && renderFtpTable()}
          {activeTab === "websites" && renderWebsitesTable()}
          {activeTab === "domains" && renderDomainsTable()}
          {activeTab === "emails" && renderEmailsTable()}
          {activeTab === "all" && renderAllCredentialsTable()}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Brak wykrytych danych do migracji. Użyj analizatora tekstu, aby wyodrębnić dane.
          </p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Wybrano {selectedCredentials.length} z {getCurrentTabCredentials().length} rekordów</p>
      </div>
    </div>
  );
};

export default CredentialsList;