/**
 * AI Service for analyzing text and extracting credentials and migration data
 * Updated to use Google Gemini API (AI Studio)
 */

// Configuration for AI API (Google Gemini)
const API_KEY = "AIzaSyB1HrEC-vXCP_b3zwUU7JsUvL-GxXB5aBI"; // albo Twój klucz bezpośrednio
const AI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const MODELS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";


/**
 * Analyzes text using Google Gemini API
 * Extracts potential credentials and migration data
 * @param {string} text - The text content to analyze
 * @param {Object} options - Additional options for analysis
 * @returns {Promise<Array>} - Array of extracted credential objects
 */
export const analyzeTextForCredentials = async (text, options = {}) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Tekst do analizy nie może być pusty");
    }

    try {
      const response = await fetch(`${AI_API_ENDPOINT}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
  contents: [{
    parts: [{
      text: `Przeanalizuj poniższą wiadomość i zwróć dane wyłącznie w formacie JSON zgodnym z tym schematem:
{
  "ftp_accounts": [{"login": "", "host": "", "password": ""}],
  "websites": [""],
  "domains": [""],
  "mail_accounts": [{"email": "", "password": ""}]
}
Jeżeli dane są nieznane, pozostaw puste pola. Nie dodawaj żadnych wyjaśnień, tylko czysty JSON.

WIADOMOŚĆ:
${text}`
    }]
  }]
})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract generated text (Gemini response)
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Use local simulation to parse AI output into structured data
      try {
  const parsed = JSON.parse(aiText);
  return parsed; // jeśli AI zwróci JSON w oczekiwanym formacie
} catch (e) {
  // jeśli AI zwróciło zwykły tekst, użyj fallback regexowy
  return simulateAIAnalysis(aiText || text, options);
}
    } catch (error) {
      console.warn("AI API error, falling back to local analysis:", error);
      return simulateAIAnalysis(text, options);
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    if (process.env.NODE_ENV !== "production") {
      return simulateAIAnalysis(text, options);
    }
    throw new Error(`Błąd podczas analizy tekstu: ${error.message}`);
  }
};



/**
 * Process raw text to extract structured migration data
 * @param {string} text - Raw email text
 * @returns {Object} - Extracted migration data
 */
export const extractMigrationData = (text) => {
  return {
    ftpAccounts: extractFtpAccounts(text),
    websitesToMigrate: extractWebsites(text),
    domains: extractDomains(text),
    emailAccounts: extractEmailAccounts(text),
  };
};

// --- BELOW: All helper functions stay the same ---
// simulateAIAnalysis, extractFtpAccounts, extractWebsites, extractDomains,
// extractEmailAccounts, extractGeneralCredentials, findRelatedCredentials
// (Unchanged from previous version)


/**
 * Simulates AI analysis for development and testing using pattern matching
 * @param {string} text - Text to analyze
 * @param {Object} options - Analysis options
 * @returns {Array} - Extracted credentials and migration data
 */
const simulateAIAnalysis = (text, options = {}) => {
  // Extract different types of information from the text
  const ftpAccounts = extractFtpAccounts(text);
  const websitesToMigrate = extractWebsites(text);
  const domains = extractDomains(text);
  const emailAccounts = extractEmailAccounts(text);
  const generalCredentials = extractGeneralCredentials(text);
  
  // Merge all results into a single credentials array
  let allCredentials = [];
  
  // Add FTP accounts
  ftpAccounts.forEach(account => {
    allCredentials.push({
      username: account.username,
      password: account.password,
      server: account.server,
      system: `FTP (${account.server})`,
      _type: "ftp",
      confidence: 0.9,
      dateExtracted: new Date().toISOString(),
      clientName: options.clientInfo?.name || null,
      clientId: options.clientInfo?.id || null,
      ticketId: options.clientInfo?.ticketId || null
    });
  });



  // Add website credentials
  websitesToMigrate.forEach(website => {
    // Find credentials that might be related to this website
    const relatedCreds = findRelatedCredentials(text, website.url);
    
    if (relatedCreds) {
      allCredentials.push({
        username: relatedCreds.username,
        password: relatedCreds.password,
        url: website.url,
        system: `Website (${new URL(website.url).hostname})`,
        _type: "website",
        confidence: 0.85,
        dateExtracted: new Date().toISOString(),
        clientName: options.clientInfo?.name || null,
        clientId: options.clientInfo?.id || null,
        ticketId: options.clientInfo?.ticketId || null
      });
    }
  });
  
  // Add domain information
  domains.forEach(domain => {
    allCredentials.push({
      username: domain.domain,
      password: "", // Usually no password for domain entries
      domain: domain.domain,
      nameservers: domain.nameservers,
      system: `Domain (${domain.domain})`,
      _type: "domain",
      confidence: 0.95,
      dateExtracted: new Date().toISOString(),
      clientName: options.clientInfo?.name || null,
      clientId: options.clientInfo?.id || null,
      ticketId: options.clientInfo?.ticketId || null
    });
  });
  
  // Add email accounts
  emailAccounts.forEach(email => {
    allCredentials.push({
      username: email.email,
      email: email.email,
      password: email.password || "",
      server: email.server,
      imapSettings: email.imapSettings,
      smtpSettings: email.smtpSettings,
      system: `Email (${email.email})`,
      _type: "email",
      confidence: 0.88,
      dateExtracted: new Date().toISOString(),
      clientName: options.clientInfo?.name || null,
      clientId: options.clientInfo?.id || null,
      ticketId: options.clientInfo?.ticketId || null
    });
  });
  
  // Add general credentials that weren't categorized
  generalCredentials.forEach(cred => {
    // Skip if it seems like we already added this as a specialized credential
    if (allCredentials.some(existingCred => 
        existingCred.username === cred.username && 
        existingCred.password === cred.password)) {
      return;
    }
    
    allCredentials.push({
      username: cred.username,
      password: cred.password,
      system: cred.system || "Nieokreślony",
      confidence: 0.7,
      dateExtracted: new Date().toISOString(),
      clientName: options.clientInfo?.name || null,
      clientId: options.clientInfo?.id || null,
      ticketId: options.clientInfo?.ticketId || null
    });
  });
  
  return allCredentials;
};

/**
 * Extracts FTP accounts from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of FTP account objects
 */
const extractFtpAccounts = (text) => {
  const ftpAccounts = [];
  
  // Look for FTP server mentions
  const ftpServerRegex = /(?:serwer(?:a)?\s*FTP|adres\s*FTP):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const ftpServerRegex2 = /FTP:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const ipAddressRegex = /(?:adres\s*IP|IP):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/gi;
  
  let ftpMatch;
  let ipMatch;
  
  // Extract FTP servers
  const ftpServers = [];
  while ((ftpMatch = ftpServerRegex.exec(text)) !== null) {
    ftpServers.push({
      server: ftpMatch[1],
      index: ftpMatch.index
    });
  }
  
  while ((ftpMatch = ftpServerRegex2.exec(text)) !== null) {
    ftpServers.push({
      server: ftpMatch[1],
      index: ftpMatch.index
    });
  }
  
  // Extract IP addresses
  while ((ipMatch = ipAddressRegex.exec(text)) !== null) {
    // Check if this IP is likely for an FTP server
    const nearbyText = text.substring(Math.max(0, ipMatch.index - 50), 
                                      Math.min(text.length, ipMatch.index + 50));
    
    if (nearbyText.toLowerCase().includes("ftp") || 
        nearbyText.toLowerCase().includes("serwer") || 
        nearbyText.toLowerCase().includes("server")) {
      ftpServers.push({
        server: ipMatch[1],
        index: ipMatch.index
      });
    }
  }
  
  // For each FTP server, find associated credentials
  ftpServers.forEach(server => {
    const nearbyLoginRegex = /(?:login|username|user|użytkownika|nazwa\s*użytkownika):\s*([a-zA-Z0-9._-]+)/i;
    const nearbyPasswordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
    
    // Look for credentials within a reasonable range of the server mention
    const startPos = Math.max(0, server.index - 300);
    const endPos = Math.min(text.length, server.index + 300);
    const nearbyText = text.substring(startPos, endPos);
    
    const loginMatch = nearbyLoginRegex.exec(nearbyText);
    const passwordMatch = nearbyPasswordRegex.exec(nearbyText);
    
    if (loginMatch) {
      ftpAccounts.push({
        server: server.server,
        username: loginMatch[1],
        password: passwordMatch ? passwordMatch[1] : ""
      });
    }
  });
  
  return ftpAccounts;
};

/**
 * Extracts websites to migrate from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of website objects
 */
const extractWebsites = (text) => {
  const websites = [];
  
  // Look for website mentions with patterns like "stronę www.example.com" or "strona https://example.com"
  const websiteRegex = /(?:stron(?:y|ę)|www|http|przeniesienia)(?:[^:]*?)(?:https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/gi;
  let websiteMatch;
  
  while ((websiteMatch = websiteRegex.exec(text)) !== null) {
    // Extract just the URL part
    const matchText = websiteMatch[0];
    const urlRegex = /(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/i;
    const urlMatch = urlRegex.exec(matchText);
    
    if (urlMatch) {
      websites.push({
        url: urlMatch[1],
        index: websiteMatch.index
      });
    }
  }
  
  // Also check for bare URLs
  const bareUrlRegex = /(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/gi;
  while ((websiteMatch = bareUrlRegex.exec(text)) !== null) {
    // Make sure this URL is not already added
    const url = websiteMatch[1];
    if (!websites.some(site => site.url === url)) {
      websites.push({
        url: url,
        index: websiteMatch.index
      });
    }
  }
  
  return websites;
};

/**
 * Extracts domains from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of domain objects
 */
const extractDomains = (text) => {
  const domains = [];
  
  // Look for mentions of domain migration
  const domainRegex = /(?:domen(?:y|ę)|domain)(?:\s+|\s*:\s*)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let domainMatch;
  
  // Also look for nameserver sections that might indicate domain delegation
  const nsRegex = /(?:serwer(?:y|ów)?\s*(?:DNS|nazw)|nameserver(?:s)?)(?:[^:]*?):?/i;
  const nsMatch = nsRegex.exec(text);
  
  let nameservers = [];
  
  // If we found a nameserver section, extract the nameservers
  if (nsMatch) {
    const nsBlockStart = nsMatch.index;
    // Look at the next 400 characters after the nameserver section starts
    const nsBlock = text.substring(nsBlockStart, Math.min(text.length, nsBlockStart + 400));
    
    // Extract nameservers like ns1.example.com, NS1.example.com, etc.
    const nsEntryRegex = /(?:ns\d+|NS\d+)\.([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    let nsEntryMatch;
    
    while ((nsEntryMatch = nsEntryRegex.exec(nsBlock)) !== null) {
      const fullNs = nsEntryMatch[0];
      if (!nameservers.includes(fullNs)) {
        nameservers.push(fullNs);
      }
    }
  }
  
  // Extract domains that are explicitly mentioned
  while ((domainMatch = domainRegex.exec(text)) !== null) {
    domains.push({
      domain: domainMatch[1],
      nameservers: nameservers,
      index: domainMatch.index
    });
  }
  
  // If we have nameservers but no explicit domains, try to extract domains from website URLs
  if (nameservers.length > 0 && domains.length === 0) {
    const websiteRegex = /(https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/gi;
    let websiteMatch;
    
    while ((websiteMatch = websiteRegex.exec(text)) !== null) {
      const domain = websiteMatch[2];
      if (!domains.some(d => d.domain === domain)) {
        domains.push({
          domain: domain,
          nameservers: nameservers,
          index: websiteMatch.index
        });
      }
    }
  }
  
  return domains;
};

/**
 * Extracts email accounts from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of email account objects
 */
const extractEmailAccounts = (text) => {
  const emailAccounts = [];
  
  // Look for email addresses and migration mentions
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let emailMatch;
  
  // Extract email configuration block if present
  const emailConfigRegex = /(?:dane|konfiguracja)\s+(?:do\s+)?(?:poczty|klient(?:a|ów)\s+pocztow)/i;
  const configMatch = emailConfigRegex.exec(text);
  
  let mailServers = {};
  
  // If we found an email configuration section, extract server information
  if (configMatch) {
    const configBlockStart = configMatch.index;
    // Look at the next 800 characters after the config section starts
    const configBlock = text.substring(configBlockStart, Math.min(text.length, configBlockStart + 800));
    
    // Extract server information
    const serverRegex = /(?:serwer\s+(?:poczty|pocztowy)|mail\s+server)(?:\s+(?:wychodząc(?:ej|a)|przychodzac(?:ej|a))?)?(?:\s*(?:to|jest|:))?\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const serverMatch = serverRegex.exec(configBlock);
    
    if (serverMatch) {
      const server = serverMatch[1];
      
      // Look for port specifications
      const imapPortRegex = /(?:port\s+IMAP|IMAP[^:]*?port):\s*(\d+)/i;
      const smtpPortRegex = /(?:port\s+SMTP|SMTP[^:]*?port):\s*(\d+)/i;
      const popPortRegex = /(?:port\s+POP3?|POP3?[^:]*?port):\s*(\d+)/i;
      
      const imapPortMatch = imapPortRegex.exec(configBlock);
      const smtpPortMatch = smtpPortRegex.exec(configBlock);
      const popPortMatch = popPortRegex.exec(configBlock);
      
      // Store server configuration
      mailServers = {
        server: server,
        imapSettings: {
          server: server,
          port: imapPortMatch ? parseInt(imapPortMatch[1]) : null,
          encryption: "SSL/TLS" // Assuming secure connection
        },
        smtpSettings: {
          server: server,
          port: smtpPortMatch ? parseInt(smtpPortMatch[1]) : null,
          encryption: "SSL/TLS"
        },
        popSettings: {
          server: server,
          port: popPortMatch ? parseInt(popPortMatch[1]) : null,
          encryption: "SSL/TLS"
        }
      };
    }
  }
  
  // Extract email addresses
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    const email = emailMatch[1];
    
    // Skip emails that are likely part of login credentials (not the actual email accounts to migrate)
    const preText = text.substring(Math.max(0, emailMatch.index - 20), emailMatch.index);
    if (preText.toLowerCase().includes("login") || 
        preText.toLowerCase().includes("user") || 
        preText.toLowerCase().includes("name")) {
      continue;
    }
    
    // Look for a password near this email
    const nearbyText = text.substring(Math.max(0, emailMatch.index - 200), 
                                      Math.min(text.length, emailMatch.index + 200));
    
    const passwordRegex = /(?:hasło|haslo|password|pass):\s*([^\s,;]+)/i;
    const passwordMatch = passwordRegex.exec(nearbyText);
    
    // Check if this email is explicitly mentioned for migration
    const isMigrationEmail = nearbyText.toLowerCase().includes("migracj") || 
                             nearbyText.toLowerCase().includes("przeniesieni") ||
                             nearbyText.toLowerCase().includes("skrzynki") ||
                             nearbyText.toLowerCase().includes("pocztow");
    
    if (isMigrationEmail) {
      emailAccounts.push({
        email: email,
        password: passwordMatch ? passwordMatch[1] : "",
        server: mailServers.server || null,
        imapSettings: mailServers.imapSettings || null,
        smtpSettings: mailServers.smtpSettings || null,
        popSettings: mailServers.popSettings || null
      });
    }
  }
  
  // If we didn't find any emails explicitly for migration, but we have server config,
  // look for any emails in the text that might be accounts
  if (emailAccounts.length === 0 && mailServers.server) {
    emailMatch = null;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    
    while ((emailMatch = emailRegex.exec(text)) !== null) {
      const email = emailMatch[1];
      
      // Skip emails that are likely part of login credentials
      const preText = text.substring(Math.max(0, emailMatch.index - 20), emailMatch.index);
      if (preText.toLowerCase().includes("login") || 
          preText.toLowerCase().includes("user") || 
          preText.toLowerCase().includes("name")) {
        continue;
      }
      
      // Look for a password near this email
      const nearbyText = text.substring(Math.max(0, emailMatch.index - 200), 
                                        Math.min(text.length, emailMatch.index + 200));
      
      const passwordRegex = /(?:hasło|haslo|password|pass):\s*([^\s,;]+)/i;
      const passwordMatch = passwordRegex.exec(nearbyText);
      
      emailAccounts.push({
        email: email,
        password: passwordMatch ? passwordMatch[1] : "",
        server: mailServers.server,
        imapSettings: mailServers.imapSettings,
        smtpSettings: mailServers.smtpSettings,
        popSettings: mailServers.popSettings
      });
    }
  }
  
  return emailAccounts;
};

/**
 * Extracts general credentials from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of credential objects
 */
const extractGeneralCredentials = (text) => {
  // This function extracts credentials that don't fit into a specific category
  const credentials = [];
  
  // Regular expressions for general credentials
  const loginBlocks = [];
  
  // Find blocks that are likely to contain login credentials
  const loginBlockRegex = /(?:dane(?:\s+do)?|login(?:\s+do)?|logowanie|konto|dostęp(?:owe)?|access|account|credentials)(?:\s+do|\s+dla)?(?:\s+|\s*:+\s*|\s*-+\s*|\s*=+\s*)(?:panel(?:u)?|admin|cpanel|serwer(?:a)?|konta|strony)?/gi;
  let blockMatch;
  
  while ((blockMatch = loginBlockRegex.exec(text)) !== null) {
    // Look at the next 400 characters after the credential block starts
    const blockStart = blockMatch.index;
    const credentialBlock = text.substring(blockStart, Math.min(text.length, blockStart + 400));
    
    loginBlocks.push({
      block: credentialBlock,
      index: blockMatch.index
    });
  }
  
  // Process each login block
  loginBlocks.forEach(block => {
    const usernameRegex = /(?:login|username|user|użytkownika?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._@-]+)/i;
    const passwordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
    const systemRegex = /(?:panel|system|strona|serwer|server|host|panel):\s*(https?:\/\/[^\s,;]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    
    const usernameMatch = usernameRegex.exec(block.block);
    const passwordMatch = passwordRegex.exec(block.block);
    const systemMatch = systemRegex.exec(block.block);
    
    if (usernameMatch && passwordMatch) {
      credentials.push({
        username: usernameMatch[1],
        password: passwordMatch[1],
        system: systemMatch ? systemMatch[1] : "Nieokreślony",
        index: block.index
      });
    }
  });
  
  // Also look for simple login/password patterns throughout the text
  const simpleLoginRegex = /(?:login|username|user|użytkownika?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._@-]+)/gi;
  let loginMatch;
  
  while ((loginMatch = simpleLoginRegex.exec(text)) !== null) {
    const username = loginMatch[1];
    
    // Check if we already found this username in a block
    if (credentials.some(cred => cred.username === username)) {
      continue;
    }
    
    // Look for a password nearby
    const nearbyText = text.substring(Math.max(0, loginMatch.index - 50), 
                                    Math.min(text.length, loginMatch.index + 200));
    
    const passwordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
    const passwordMatch = passwordRegex.exec(nearbyText);
    
    if (passwordMatch) {
      // Try to determine what system this is for
      const contextText = text.substring(Math.max(0, loginMatch.index - 100), 
                                        Math.min(text.length, loginMatch.index + 100));
      
      let system = "Nieokreślony";
      
      if (contextText.toLowerCase().includes("ftp")) {
        system = "FTP";
      } else if (contextText.toLowerCase().includes("panel")) {
        system = "Panel administracyjny";
      } else if (contextText.toLowerCase().includes("cpanel") || contextText.toLowerCase().includes("cpsess")) {
        system = "cPanel";
      } else if (contextText.toLowerCase().includes("host")) {
        system = "Hosting";
      } else if (contextText.toLowerCase().includes("mail") || contextText.toLowerCase().includes("poczt")) {
        system = "Email";
      }
      
      credentials.push({
        username: username,
        password: passwordMatch[1],
        system: system,
        index: loginMatch.index
      });
    }
  }
  
  return credentials;
};

/**
 * Find credentials that might be related to a specific website
 * @param {string} text - Full text content
 * @param {string} websiteUrl - Website URL to find related credentials
 * @returns {Object|null} - Related credentials or null if none found
 */
const findRelatedCredentials = (text, websiteUrl) => {
  try {
    // Extract domain from URL
    const url = new URL(websiteUrl);
    const domain = url.hostname;
    
    // Look for credentials in sections that mention this domain
    const domainMentionRegex = new RegExp(`(?:dane|login|dostęp|credentials|konto|account)(?:\\s+do)?(?:.*?)${domain.replace(/\./g, "\\.")}`, "i");
    const domainMatch = domainMentionRegex.exec(text);
    
    if (domainMatch) {
      const contextStart = Math.max(0, domainMatch.index - 50);
      const contextEnd = Math.min(text.length, domainMatch.index + 400);
      const contextText = text.substring(contextStart, contextEnd);
      
      // Look for username/password in this context
      const usernameRegex = /(?:login|username|user|użytkownika?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._@-]+)/i;
      const passwordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
      
      const usernameMatch = usernameRegex.exec(contextText);
      const passwordMatch = passwordRegex.exec(contextText);
      
      if (usernameMatch && passwordMatch) {
        return {
          username: usernameMatch[1],
          password: passwordMatch[1]
        };
      }
    }
    
    // If no explicit mention with credentials, try to find credentials near the URL
    const urlIndex = text.indexOf(websiteUrl);
    if (urlIndex !== -1) {
      const contextStart = Math.max(0, urlIndex - 200);
      const contextEnd = Math.min(text.length, urlIndex + 200);
      const contextText = text.substring(contextStart, contextEnd);
      
      const usernameRegex = /(?:login|username|user|użytkownika?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._@-]+)/i;
      const passwordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
      
      const usernameMatch = usernameRegex.exec(contextText);
      const passwordMatch = passwordRegex.exec(contextText);
      
      if (usernameMatch && passwordMatch) {
        return {
          username: usernameMatch[1],
          password: passwordMatch[1]
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error finding related credentials:", error);
    return null;
  }
};

/**
 * Gets the available AI models that can be used for analysis (Gemini API)
 * @returns {Promise<Array>} - List of available AI models with capabilities
 */
export const getAvailableAIModels = async () => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data.models)) {
      return data.models;
    }
    // fallback jeśli API nie zwróciło modeli
    return [
      { 
        id: "gemini-pro", 
        name: "Gemini Pro", 
        capabilities: ["text-generation"], 
        languages: ["pl", "en"], 
        isDefault: true 
      }
    ];
  } catch (error) {
    console.error("Error fetching AI models:", error);
    // Return mock data for development
    return [
      { 
        id: "gemini-pro", 
        name: "Gemini Pro", 
        capabilities: ["text-generation"], 
        languages: ["pl", "en"], 
        isDefault: true 
      }
    ];
  }
};

/**
 * Updates the AI analysis parameters (local only, Gemini API does not support remote config)
 * @param {Object} params - The parameters to update
 * @returns {Promise<Object>} - Result of the update operation
 */
export const updateAnalysisParameters = async (params) => {
  console.warn("updateAnalysisParameters is simulated locally; Gemini API does not support remote config.");
  return {
    success: true,
    message: "Parametry analizy zaktualizowane pomyślnie (lokalnie)",
    updatedParams: params
  };
};
