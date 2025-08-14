javascript
/**
 * Credential Extractor Utility
 * 
 * Provides specialized functions for extracting different types of credentials
 * and connection information from text using regex patterns and context analysis.
 */

/**
 * Main extraction function that runs all specialized extractors
 * @param {string} text - Raw text to analyze
 * @returns {Object} - All extracted credentials and configuration data
 */
export const extractAllCredentials = (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return {
      ftpAccounts: [],
      serverCredentials: [],
      emailAccounts: [],
      websites: [],
      domains: [],
      dnsRecords: [],
      databases: [],
      genericCredentials: []
    };
  }

  return {
    ftpAccounts: extractFtpCredentials(text),
    serverCredentials: extractServerCredentials(text),
    emailAccounts: extractEmailAccounts(text),
    websites: extractWebsites(text),
    domains: extractDomainInfo(text),
    dnsRecords: extractDnsRecords(text),
    databases: extractDatabaseCredentials(text),
    genericCredentials: extractGenericCredentials(text)
  };
};

/**
 * Extracts FTP credentials from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of FTP credential objects
 */
export const extractFtpCredentials = (text) => {
  const ftpAccounts = [];
  
  // Define regex patterns for FTP information
  const patterns = {
    ftpServer: [
      /(?:serwer(?:a)?\s*FTP|adres\s*FTP):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /FTP:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /(?:FTP|serwer\s+FTP)(?:[^:]*?)(?:jest|to)?(?::\s*|\s+)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    ftpUsername: [
      /(?:login|username|user|użytkownik(?:a)?|nazwa\s*użytkownika)(?:\s+FTP)?:\s*([a-zA-Z0-9._-]+)/i,
      /(?:FTP|serwer\s+FTP)(?:[^:]*?)(?:login|username|user):\s*([a-zA-Z0-9._-]+)/i
    ],
    ftpPassword: [
      /(?:hasło|haslo|password|pass|pwd)(?:\s+FTP)?:\s*([^\s,;]+)/i,
      /(?:FTP|serwer\s+FTP)(?:[^:]*?)(?:hasło|haslo|password|pass):\s*([^\s,;]+)/i
    ],
    ftpPort: [
      /(?:port\s+FTP|FTP\s+port):\s*(\d+)/i
    ]
  };

  // First find FTP servers
  const ftpServers = [];
  
  // Look for all FTP server mentions
  patterns.ftpServer.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Store the server and position in text for context analysis
      ftpServers.push({
        server: match[1],
        index: match.index
      });
      
      // Update the regex lastIndex to avoid infinite loop with global flag
      pattern.lastIndex = match.index + match[0].length;
    }
  });
  
  // Also check for IP addresses that might be FTP servers
  const ipRegex = /(?:adres\s*IP|IP):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/gi;
  let ipMatch;
  
  while ((ipMatch = ipRegex.exec(text)) !== null) {
    // Check surrounding text to see if this IP is for an FTP server
    const nearbyText = getNearbyText(text, ipMatch.index, 50);
    
    if (nearbyText.toLowerCase().includes("ftp") || 
        (nearbyText.toLowerCase().includes("serwer") && !nearbyText.toLowerCase().includes("mail"))) {
      ftpServers.push({
        server: ipMatch[1],
        index: ipMatch.index
      });
    }
  }
  
  // For each FTP server, find associated credentials
  ftpServers.forEach(server => {
    const nearbyText = getNearbyText(text, server.index, 300);
    
    // Find username
    let username = null;
    for (const pattern of patterns.ftpUsername) {
      const usernameMatch = pattern.exec(nearbyText);
      if (usernameMatch) {
        username = usernameMatch[1];
        break;
      }
    }
    
    // Find password
    let password = null;
    for (const pattern of patterns.ftpPassword) {
      const passwordMatch = pattern.exec(nearbyText);
      if (passwordMatch) {
        password = passwordMatch[1];
        break;
      }
    }
    
    // Find port if specified
    let port = null;
    for (const pattern of patterns.ftpPort) {
      const portMatch = pattern.exec(nearbyText);
      if (portMatch) {
        port = parseInt(portMatch[1]);
        break;
      }
    }
    
    // Add to results if we at least have a server and username
    if (username) {
      ftpAccounts.push({
        server: server.server,
        username,
        password,
        port: port || 21, // Default FTP port
        type: "ftp",
        confidence: password ? 0.9 : 0.7
      });
    }
  });
  
  return ftpAccounts;
};

/**
 * Extracts server credentials (SSH, cPanel, admin panels) from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of server credential objects
 */
export const extractServerCredentials = (text) => {
  const serverCredentials = [];
  
  // Define regex patterns for server information
  const patterns = {
    cpanel: [
      /(?:cPanel|panel|panel\s+administracyjny)(?:[^:]*?)(?:jest|to)?(?::\s*|\s+)(https?:\/\/[^\s]+)/i,
      /(https?:\/\/[^/\s]+(?:\/cpsess\d+\/|\/cpanel|\/panel|\/whm|:[0-9]+\/)[^\s]*)/i
    ],
    panelUrl: [
      /(?:adres\s+panelu|panel):\s*(https?:\/\/[^\s,;]+)/i
    ],
    serverAddress: [
      /(?:adres\s+serwera|serwer|server):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /(?:host(?:ing)?):\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    username: [
      /(?:login|username|user|użytkownik(?:a)?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._-]+)/i
    ],
    password: [
      /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i
    ]
  };

  // Extract control panel URLs
  let panelUrls = [];
  
  // Look for cPanel and other control panel URLs
  patterns.cpanel.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      panelUrls.push({
        url: match[1],
        type: "cpanel",
        index: match.index
      });
      
      // Update lastIndex to avoid infinite loop
      pattern.lastIndex = match.index + match[0].length;
    }
  });
  
  patterns.panelUrl.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[1];
      
      // Determine panel type
      let type = "panel";
      if (url.includes("cpanel") || url.includes("cpsess") || url.includes("whm")) {
        type = "cpanel";
      } else if (url.includes("plesk")) {
        type = "plesk";
      } else if (url.includes("directadmin")) {
        type = "directadmin";
      }
      
      panelUrls.push({
        url,
        type,
        index: match.index
      });
      
      // Update lastIndex to avoid infinite loop
      pattern.lastIndex = match.index + match[0].length;
    }
  });
  
  // Extract server addresses
  let servers = [];
  
  patterns.serverAddress.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      servers.push({
        server: match[1],
        index: match.index
      });
      
      // Update lastIndex to avoid infinite loop
      pattern.lastIndex = match.index + match[0].length;
    }
  });
  
  // Process panel URLs to find credentials
  panelUrls.forEach(panel => {
    const nearbyText = getNearbyText(text, panel.index, 400);
    
    // Find username
    let username = null;
    for (const pattern of patterns.username) {
      const usernameMatch = pattern.exec(nearbyText);
      if (usernameMatch) {
        username = usernameMatch[1];
        break;
      }
    }
    
    // Find password
    let password = null;
    for (const pattern of patterns.password) {
      const passwordMatch = pattern.exec(nearbyText);
      if (passwordMatch) {
        password = passwordMatch[1];
        break;
      }
    }
    
    // Add to results
    serverCredentials.push({
      url: panel.url,
      username,
      password,
      type: panel.type,
      confidence: username && password ? 0.9 : 0.7
    });
  });
  
  // Process server addresses to find credentials
  servers.forEach(server => {
    const nearbyText = getNearbyText(text, server.index, 400);
    
    // Find username
    let username = null;
    for (const pattern of patterns.username) {
      const usernameMatch = pattern.exec(nearbyText);
      if (usernameMatch) {
        username = usernameMatch[1];
        break;
      }
    }
    
    // Find password
    let password = null;
    for (const pattern of patterns.password) {
      const passwordMatch = pattern.exec(nearbyText);
      if (passwordMatch) {
        password = passwordMatch[1];
        break;
      }
    }
    
    // Add to results if we have at least a server and username
    if (username) {
      serverCredentials.push({
        server: server.server,
        username,
        password,
        type: "server",
        confidence: password ? 0.9 : 0.7
      });
    }
  });
  
  return serverCredentials;
};

/**
 * Extracts email account information from text
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of email account objects
 */
export const extractEmailAccounts = (text) => {
  const emailAccounts = [];
  
  // Define regex patterns for email information
  const patterns = {
    emailAddress: [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ],
    emailConfig: [
      /(?:dane|konfiguracja)\s+(?:do\s+)?(?:poczty|klient(?:a|ów)\s+pocztow)/i
    ],
    mailServer: [
      /(?:serwer(?:a)?\s+(?:poczty|pocztow[ya])|mail\s+server)(?:\s+(?:wychodząc(?:ej|a)|przychodzac(?:ej|a))?)?(?:\s*(?:to|jest|:))?\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /(?:IMAP|POP3|SMTP)(?:[^:]*?)(?:jest|to)?(?::\s*|\s+)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    password: [
      /(?:hasło|haslo|password|pass|pwd)(?:\s+(?:poczty|email|mail))?:\s*([^\s,;]+)/i
    ],
    imapPort: [
      /(?:port\s+IMAP|IMAP[^:]*?port):\s*(\d+)/i
    ],
    smtpPort: [
      /(?:port\s+SMTP|SMTP[^:]*?port):\s*(\d+)/i
    ],
    popPort: [
      /(?:port\s+POP3?|POP3?[^:]*?port):\s*(\d+)/i
    ]
  };

  // Extract email configuration section
  let mailServerConfig = null;
  
  // Look for email configuration section
  const configMatch = patterns.emailConfig.exec(text);
  if (configMatch) {
    const configSectionText = text.substring(configMatch.index, Math.min(text.length, configMatch.index + 800));
    
    // Find mail server
    let serverMatch = null;
    for (const pattern of patterns.mailServer) {
      serverMatch = pattern.exec(configSectionText);
      if (serverMatch) break;
    }
    
    if (serverMatch) {
      const server = serverMatch[1];
      
      // Find port specifications
      const imapPortMatch = patterns.imapPort.exec(configSectionText);
      const smtpPortMatch = patterns.smtpPort.exec(configSectionText);
      const popPortMatch = patterns.popPort.exec(configSectionText);
      
      mailServerConfig = {
        server,
        imapPort: imapPortMatch ? parseInt(imapPortMatch[1]) : 993,
        smtpPort: smtpPortMatch ? parseInt(smtpPortMatch[1]) : 465,
        popPort: popPortMatch ? parseInt(popPortMatch[1]) : 995,
        encryption: "SSL/TLS" // Assuming secure connection
      };
    }
  }
  
  // Extract email addresses
  let emailMatch;
  const pattern = patterns.emailAddress[0];
  
  while ((emailMatch = pattern.exec(text)) !== null) {
    const email = emailMatch[1];
    const nearbyText = getNearbyText(text, emailMatch.index, 300);
    
    // Skip emails that are likely part of login credentials or usernames
    const preText = text.substring(Math.max(0, emailMatch.index - 20), emailMatch.index);
    if (preText.toLowerCase().includes("login") || 
        preText.toLowerCase().includes("user") || 
        preText.toLowerCase().includes("nazwa użytkownika")) {
      continue;
    }
    
    // Check if this email is mentioned for migration
    const isMigrationEmail = nearbyText.toLowerCase().includes("migracj") || 
                             nearbyText.toLowerCase().includes("przeniesieni") ||
                             nearbyText.toLowerCase().includes("skrzynki") ||
                             nearbyText.toLowerCase().includes("pocztow");
    
    // Find password
    let password = null;
    const passwordMatch = patterns.password.exec(nearbyText);
    if (passwordMatch) {
      password = passwordMatch[1];
    }
    
    // Add to results if it's likely an email account to be migrated
    if (isMigrationEmail || mailServerConfig) {
      emailAccounts.push({
        email,
        password,
        server: mailServerConfig ? mailServerConfig.server : null,
        imapPort: mailServerConfig ? mailServerConfig.imapPort : null,
        smtpPort: mailServerConfig ? mailServerConfig.smtpPort : null,
        popPort: mailServerConfig ? mailServerConfig.popPort : null,
        encryption: mailServerConfig ? mailServerConfig.encryption : null,
        type: "email",
        confidence: password ? 0.9 : 0.7
      });
    }
  }
  
  return emailAccounts;
};

/**
 * Extracts website URLs and related information
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of website objects
 */
export const extractWebsites = (text) => {
  const websites = [];
  
  // Define regex patterns for website information
  const patterns = {
    website: [
      /(?:stron(?:y|ę)|www|http|przeniesienia)(?:[^:]*?)(?:https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/i,
      /(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/g
    ],
    loginUrl: [
      /(?:(?:strona|adres)\s+(?:logowania|administracyjn[ya])|admin(?:\s+page)?)(?:\s*(?:to|jest|:))?\s*(https?:\/\/[^\s,;]+)/i
    ]
  };

  // Extract website URLs
  let foundUrls = new Set();
  
  // First check for websites mentioned in context
  let websiteMatch;
  const contextPattern = patterns.website[0];
  
  while ((websiteMatch = contextPattern.exec(text)) !== null) {
    // Extract just the URL part
    const matchText = websiteMatch[0];
    const urlPattern = /(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,;)]*)/i;
    const urlMatch = urlPattern.exec(matchText);
    
    if (urlMatch && !foundUrls.has(urlMatch[1])) {
      foundUrls.add(urlMatch[1]);
      
      websites.push({
        url: urlMatch[1],
        type: "website",
        index: websiteMatch.index,
        confidence: 0.9
      });
    }
    
    // Update lastIndex to avoid infinite loop
    contextPattern.lastIndex = websiteMatch.index + matchText.length;
  }
  
  // Then check for bare URLs
  const urlPattern = patterns.website[1];
  websiteMatch = null;
  
  while ((websiteMatch = urlPattern.exec(text)) !== null) {
    const url = websiteMatch[1];
    
    // Skip if we already found this URL
    if (!foundUrls.has(url)) {
      foundUrls.add(url);
      
      // Determine confidence based on context
      let confidence = 0.7;
      const nearbyText = getNearbyText(text, websiteMatch.index, 100);
      
      if (nearbyText.toLowerCase().includes("stron") || 
          nearbyText.toLowerCase().includes("www") ||
          nearbyText.toLowerCase().includes("przenies") ||
          nearbyText.toLowerCase().includes("migrac")) {
        confidence = 0.9;
      }
      
      websites.push({
        url,
        type: "website",
        index: websiteMatch.index,
        confidence
      });
    }
  }
  
  // Look for login URLs for each website
  websites.forEach(website => {
    const domain = extractDomainFromUrl(website.url);
    if (domain) {
      // Look for login URLs containing this domain
      const loginRegex = new RegExp(`(https?://[^\\s]+${domain.replace(/\./g, "\\.")}[^\\s]*(?:admin|login|panel|cpanel|wp-admin)[^\\s]*)`, "i");
      const loginMatch = loginRegex.exec(text);
      
      if (loginMatch) {
        website.loginUrl = loginMatch[1];
      } else {
        // Check general login URL patterns
        for (const pattern of patterns.loginUrl) {
          const generalLoginMatch = pattern.exec(getNearbyText(text, website.index, 400));
          if (generalLoginMatch) {
            website.loginUrl = generalLoginMatch[1];
            break;
          }
        }
      }
      
      // Try to find credentials for this website
      const nearbyText = getNearbyText(text, website.index, 400);
      const usernameRegex = /(?:login|username|user|użytkownika?|nazwa\s*użytkownika):\s*([a-zA-Z0-9._@-]+)/i;
      const passwordRegex = /(?:hasło|haslo|password|pass|pwd):\s*([^\s,;]+)/i;
      
      const usernameMatch = usernameRegex.exec(nearbyText);
      const passwordMatch = passwordRegex.exec(nearbyText);
      
      if (usernameMatch) {
        website.username = usernameMatch[1];
      }
      
      if (passwordMatch) {
        website.password = passwordMatch[1];
      }
      
      // Try to detect CMS type
      website.cmsType = detectCmsType(website.url, text);
    }
  });
  
  return websites;
};

/**
 * Attempts to detect CMS type from URL or context
 * @param {string} url - Website URL
 * @param {string} contextText - Full text for context analysis
 * @returns {string|null} - Detected CMS type or null
 */
const detectCmsType = (url, contextText) => {
  if (!url) return null;
  
  const lowerUrl = url.toLowerCase();
  const lowerContext = contextText.toLowerCase();
  
  // Check URL for CMS indicators
  if (lowerUrl.includes("/wp-") || lowerUrl.includes("wp-admin") || lowerUrl.includes("wp-content")) {
    return "WordPress";
  } else if (lowerUrl.includes("/administrator") || lowerUrl.includes("joomla")) {
    return "Joomla";
  } else if (lowerUrl.includes("/drupal") || lowerUrl.includes("/sites/all/")) {
    return "Drupal";
  } else if (lowerUrl.includes("magento") || lowerUrl.includes("/admin_")) {
    return "Magento";
  } else if (lowerUrl.includes("prestashop") || lowerUrl.includes("/adminps/")) {
    return "PrestaShop";
  }
  
  // Check context for CMS mentions
  if (lowerContext.includes("wordpress") || lowerContext.includes(" wp ")) {
    return "WordPress";
  } else if (lowerContext.includes("joomla")) {
    return "Joomla";
  } else if (lowerContext.includes("drupal")) {
    return "Drupal";
  } else if (lowerContext.includes("magento")) {
    return "Magento";
  } else if (lowerContext.includes("prestashop")) {
    return "PrestaShop";
  } else if (lowerContext.includes("woocommerce")) {
    return "WooCommerce";
  } else if (lowerContext.includes("shopify")) {
    return "Shopify";
  }
  
  return null;
};

/**
 * Extracts domain information and nameservers
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of domain objects
 */
export const extractDomainInfo = (text) => {
  const domains = [];
  
  // Define regex patterns for domain information
  const patterns = {
    domain: [
      /(?:domen(?:y|ę)|domain)(?:\s+|\s*:\s*)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
      /(?:przekierowanie|przeniesienie)\s+(?:domeny|domen(?:y)?)(?:\s+|\s*:\s*)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
    ],
    nameserverSection: [
      /(?:serwer(?:y|ów)?\s*(?:DNS|nazw)|nameserver(?:s)?)(?:[^:]*?):/i,
      /(?:adresy?\s+serwerów\s+DNS|DNS(?:\s+servers)?)\s+(?:potrzebne|to)(?:[^:]*?):/i
    ],
    nameserver: [
      /(?:ns\d+|NS\d+)\.([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /(?:ns\d+|NS\d+)(?:\s*[=:]\s*|\s+)([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ]
  };

  // Extract nameservers first
  let nameservers = [];
  
  // Look for nameserver sections
  for (const pattern of patterns.nameserverSection) {
    const nsMatch = pattern.exec(text);
    if (nsMatch) {
      const nsBlockStart = nsMatch.index;
      // Look at the next 400 characters after the nameserver section starts
      const nsBlock = text.substring(nsBlockStart, Math.min(text.length, nsBlockStart + 400));
      
      // Extract nameserver entries
      for (const nsPattern of patterns.nameserver) {
        let nsEntryMatch;
        while ((nsEntryMatch = nsPattern.exec(nsBlock)) !== null) {
          const fullNs = nsEntryMatch[0].includes(".") ? nsEntryMatch[0] : `ns.${nsEntryMatch[1]}`;
          if (!nameservers.includes(fullNs)) {
            nameservers.push(fullNs);
          }
        }
      }
      
      // Also look for simple lines with just nameserver hostnames
      const nsLines = nsBlock.split("\n");
      for (let i = 1; i < nsLines.length; i++) {
        // Skip the first line since it's the header
        const line = nsLines[i].trim();
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(line)) {
          // This looks like a hostname on its own line
          if (!nameservers.includes(line)) {
            nameservers.push(line);
          }
        }
      }
      
      break; // Use the first nameserver section we find
    }
  }
  
  // Extract explicitly mentioned domains
  for (const pattern of patterns.domain) {
    let domainMatch;
    while ((domainMatch = pattern.exec(text)) !== null) {
      const domain = domainMatch[1];
      
      // Skip if we already have this domain
      if (domains.some(d => d.domain === domain)) {
        continue;
      }
      
      domains.push({
        domain,
        nameservers: nameservers.length > 0 ? [...nameservers] : [],
        type: "domain",
        index: domainMatch.index,
        confidence: 0.9
      });
    }
  }
  
  // If we have nameservers but no explicit domains, extract domains from website URLs
  if (nameservers.length > 0 && domains.length === 0) {
    const websiteRegex = /(https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))/gi;
    let websiteMatch;
    
    while ((websiteMatch = websiteRegex.exec(text)) !== null) {
      const domain = websiteMatch[2];
      
      // Skip if we already have this domain
      if (domains.some(d => d.domain === domain)) {
        continue;
      }
      
      domains.push({
        domain,
        nameservers: [...nameservers],
        type: "domain",
        index: websiteMatch.index,
        confidence: 0.8
      });
    }
  }
  
  return domains;
};

/**
 * Extracts DNS records and nameserver information
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of DNS record objects
 */
export const extractDnsRecords = (text) => {
  const dnsRecords = [];
  
  // Define regex patterns for DNS information
  const patterns = {
    dnsSection: [
      /(?:rekordy|wpisy|konfiguracja)\s+DNS/i,
      /(?:ustawienia|konfiguracja)\s+(?:DNS|domen(?:y)?)/i
    ],
    aRecord: [
      /(?:rekord|wpis|record)\s+A(?:\s+dla)?\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+(?:to|jest|:|\s+->\s+))?\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i,
      /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:IN\s+)?A\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i
    ],
    mxRecord: [
      /(?:rekord|wpis|record)\s+MX(?:\s+dla)?\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+(?:to|jest|:|\s+->\s+))?\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:IN\s+)?MX\s+(?:\d+\s+)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    cnameRecord: [
      /(?:rekord|wpis|record)\s+CNAME(?:\s+dla)?\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+(?:to|jest|:|\s+->\s+))?\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:IN\s+)?CNAME\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ],
    txtRecord: [
      /(?:rekord|wpis|record)\s+TXT(?:\s+dla)?\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+(?:to|jest|:|\s+->\s+))?\s*"([^"]*)"/i,
      /([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+(?:IN\s+)?TXT\s+"([^"]*)"/i
    ]
  };

  // Look for DNS configuration sections
  let dnsSectionStart = -1;
  
  for (const pattern of patterns.dnsSection) {
    const sectionMatch = pattern.exec(text);
    if (sectionMatch) {
      dnsSectionStart = sectionMatch.index;
      break;
    }
  }
}