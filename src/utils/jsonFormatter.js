/**
 * Utility functions for formatting and structuring extracted credentials into properly grouped JSON format
 */

/**
 * Groups credentials by client and ticket information for structured export
 * @param {Array} credentials - Array of credential objects to be grouped
* @returns {Object} - Hierarchically grouped credentials
 */
export const groupCredentialsByClient = (credentials) => {
  if (!Array.isArray(credentials) || credentials.length === 0) {
    return {};
  }

  const groupedData = {};
  
  credentials.forEach(credential => {
    const clientId = credential.clientId || "unknown";
    if (!groupedData[clientId]) {
      groupedData[clientId] = {
        clientName: credential.clientName || "Nieznany Klient",
        clientInfo: {
          id: credential.clientId || null,
          dateAdded: new Date().toISOString().split("T")[0]
        },
        tickets: {}
      };
    }
    
    const ticketId = credential.ticketId || "general";
    if (!groupedData[clientId].tickets[ticketId]) {
      groupedData[clientId].tickets[ticketId] = {
        credentials: [],
        metadata: {
          dateCreated: new Date().toISOString()
        }
      };
    }
    
    // Add credential based on its type
    if (credential._type === "ftp" || credential.system?.toLowerCase().includes("ftp")) {
      groupedData[clientId].tickets[ticketId].credentials.push(formatFTPAccount(credential));
    } else if (credential._type === "website" || credential.system?.toLowerCase().includes("web")) {
      groupedData[clientId].tickets[ticketId].credentials.push(formatWebsite(credential));
    } else if (credential._type === "domain" || credential.system?.toLowerCase().includes("domain")) {
      groupedData[clientId].tickets[ticketId].credentials.push(formatDomain(credential));
    } else if (credential._type === "email" || credential.username?.includes("@") || credential.system?.toLowerCase().includes("email")) {
      groupedData[clientId].tickets[ticketId].credentials.push(formatEmailAccount(credential));
    } else {
      groupedData[clientId].tickets[ticketId].credentials.push(formatGenericCredential(credential));
    }
  });

  return groupedData;
};

/**
 * Formats FTP account data into a standardized structure
 * @param {Object} credential - FTP account credential
 * @returns {Object} - Formatted FTP account object
 */
export const formatFTPAccount = (credential) => {
  return {
    type: "ftp",
    server: credential.server || credential.system?.replace("FTP (", "").replace(")", "") || null,
    username: credential.username || null,
    password: credential.password || null,
    port: credential.port || 21,
    encryption: credential.encryption || "FTP",
    dateExtracted: credential.dateExtracted || new Date().toISOString(),
    confidence: credential.confidence || 1.0
  };
};

/**
 * Formats website credential data into a standardized structure
 * @param {Object} credential - Website credential
 * @returns {Object} - Formatted website credential object
 */
export const formatWebsite = (credential) => {
  return {
    type: "website",
    url: credential.url || null,
    hostname: credential.url ? new URL(credential.url).hostname : null,
    loginDetails: {
      username: credential.username || null,
      password: credential.password || null,
      loginUrl: credential.loginUrl || null
    },
    cms: detectCMS(credential.url || credential.system || ""),
    dateExtracted: credential.dateExtracted || new Date().toISOString(),
    confidence: credential.confidence || 1.0
  };
};

/**
 * Formats domain data into a standardized structure
 * @param {Object} credential - Domain credential
 * @returns {Object} - Formatted domain object
 */
export const formatDomain = (credential) => {
  return {
    type: "domain",
    domain: credential.domain || credential.username || null,
    registrar: credential.registrar || null,
    nameservers: credential.nameservers || [],
    delegation: {
      required: Boolean(credential.nameservers && credential.nameservers.length > 0),
      currentNameservers: credential.currentNameservers || null
    },
    dateExtracted: credential.dateExtracted || new Date().toISOString(),
    confidence: credential.confidence || 1.0
  };
};

/**
 * Formats email account data into a standardized structure
 * @param {Object} credential - Email account credential
 * @returns {Object} - Formatted email account object
 */
export const formatEmailAccount = (credential) => {
  // Determine server details from credential
  const server = credential.server || 
                 (credential.imapSettings ? credential.imapSettings.server : null) || 
                 (credential.smtpSettings ? credential.smtpSettings.server : null) || 
                 null;
                 
  const smtpPort = credential.smtpSettings ? credential.smtpSettings.port : (credential.smtpPort || null);
  const imapPort = credential.imapSettings ? credential.imapSettings.port : (credential.imapPort || null);
  const popPort = credential.popSettings ? credential.popSettings.port : (credential.popPort || null);

  return {
    type: "email",
    email: credential.email || credential.username || null,
    password: credential.password || null,
    serverConfiguration: {
      server: server,
      incomingServer: {
        imap: {
          hostname: server,
          port: imapPort || 993,
          encryption: "SSL/TLS",
          authentication: "Normal Password"
        },
        pop3: popPort ? {
          hostname: server,
          port: popPort || 995,
          encryption: "SSL/TLS",
          authentication: "Normal Password"
        } : null
      },
      outgoingServer: {
        smtp: {
          hostname: server,
          port: smtpPort || 465,
          encryption: "SSL/TLS",
          authentication: "Normal Password"
        }
      }
    },
    dateExtracted: credential.dateExtracted || new Date().toISOString(),
    confidence: credential.confidence || 1.0
  };
};

/**
 * Formats generic credential data that doesn't fit a specific category
 * @param {Object} credential - Generic credential
 * @returns {Object} - Formatted generic credential object
 */
export const formatGenericCredential = (credential) => {
  return {
    type: "generic",
    username: credential.username || null,
    password: credential.password || null,
    system: credential.system || "Nieokreślony",
    dateExtracted: credential.dateExtracted || new Date().toISOString(),
    confidence: credential.confidence || 1.0
  };
};

/**
 * Attempts to detect CMS type from URL or system info
 * @param {string} urlOrSystem - URL or system information
 * @returns {string|null} - Detected CMS type or null
 */
const detectCMS = (urlOrSystem) => {
  const lowerCase = urlOrSystem.toLowerCase();
  
  if (lowerCase.includes("wordpress") || lowerCase.includes("/wp-") || lowerCase.includes("/wp-admin")) {
    return "WordPress";
  } else if (lowerCase.includes("joomla")) {
    return "Joomla";
  } else if (lowerCase.includes("drupal")) {
    return "Drupal";
  } else if (lowerCase.includes("magento")) {
    return "Magento";
  } else if (lowerCase.includes("prestashop")) {
    return "PrestaShop";
  } else if (lowerCase.includes("woocommerce")) {
    return "WooCommerce";
  } else if (lowerCase.includes("shopify")) {
    return "Shopify";
  } else {
    return null;
  }
};

/**
 * Creates a categorized structure for migration data
 * @param {Array} credentials - Array of mixed credential objects
 * @returns {Object} - Categorized migration data
 */
export const categorizeMigrationData = (credentials) => {
  if (!Array.isArray(credentials) || credentials.length === 0) {
    return {
      ftpAccounts: [],
      websites: [],
      domains: [],
      emailAccounts: [],
      otherCredentials: []
    };
  }

  const result = {
    ftpAccounts: [],
    websites: [],
    domains: [],
    emailAccounts: [],
    otherCredentials: []
  };

  credentials.forEach(cred => {
    if (cred._type === "ftp" || cred.system?.toLowerCase().includes("ftp")) {
      result.ftpAccounts.push(formatFTPAccount(cred));
    } else if (cred._type === "website" || cred.system?.toLowerCase().includes("web")) {
      result.websites.push(formatWebsite(cred));
    } else if (cred._type === "domain" || cred.system?.toLowerCase().includes("domain")) {
      result.domains.push(formatDomain(cred));
    } else if (cred._type === "email" || cred.username?.includes("@") || cred.system?.toLowerCase().includes("email")) {
      result.emailAccounts.push(formatEmailAccount(cred));
    } else {
      result.otherCredentials.push(formatGenericCredential(cred));
    }
  });

  return result;
};

/**
 * Converts grouped credentials structure to a flat array format
 * @param {Object} groupedData - Grouped credential data
 * @returns {Array} - Flattened array of credential objects
 */
export const flattenGroupedCredentials = (groupedData) => {
  if (!groupedData || typeof groupedData !== "object") {
    return [];
  }

  const flatCredentials = [];
  
  Object.keys(groupedData).forEach(clientId => {
    const client = groupedData[clientId];
    
    Object.keys(client.tickets).forEach(ticketId => {
      const ticket = client.tickets[ticketId];
      
      ticket.credentials.forEach(cred => {
        // Add client and ticket info to each credential
        flatCredentials.push({
          ...cred,
          clientId,
          clientName: client.clientName,
          ticketId
        });
      });
    });
  });
  
  return flatCredentials;
};

/**
 * Creates a JSON file with credential data and provides download link
 * @param {Array} credentials - Array of credential objects
 * @param {Boolean} grouped - Whether to group credentials or keep as flat array
 * @param {Boolean} categorized - Whether to categorize by credential type
 * @returns {string} - URL to the generated file
 */
export const createJsonFile = (credentials, grouped = true, categorized = false) => {
  if (!Array.isArray(credentials) || credentials.length === 0) {
    throw new Error("Brak danych uwierzytelniających do eksportu");
  }
  
  let dataToExport;
  
  if (categorized) {
    dataToExport = categorizeMigrationData(credentials);
  } else if (grouped) {
    dataToExport = groupCredentialsByClient(credentials);
  } else {
    dataToExport = credentials.map(cred => {
      if (cred._type === "ftp" || cred.system?.toLowerCase().includes("ftp")) {
        return formatFTPAccount(cred);
      } else if (cred._type === "website" || cred.system?.toLowerCase().includes("web")) {
        return formatWebsite(cred);
      } else if (cred._type === "domain" || cred.system?.toLowerCase().includes("domain")) {
        return formatDomain(cred);
      } else if (cred._type === "email" || cred.username?.includes("@") || cred.system?.toLowerCase().includes("email")) {
        return formatEmailAccount(cred);
      } else {
        return formatGenericCredential(cred);
      }
    });
  }
  
  const jsonString = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  return URL.createObjectURL(blob);
};

/**
 * Formats and downloads credential data as a JSON file
 * @param {Array} credentials - Array of credential objects to export
 * @param {Object} options - Export options
 * @param {Boolean} options.grouped - Whether to group credentials (default: true)
 * @param {Boolean} options.categorized - Whether to categorize by type (default: false)
 * @param {String} options.filename - Custom filename for export (default: generates based on date)
 * @returns {Boolean} - Success status of the export
 */
export const exportCredentialsToJson = (credentials, options = {}) => {
  try {
    const { grouped = true, categorized = false, filename } = options;
    
    // Generate the JSON blob URL
    const jsonUrl = createJsonFile(credentials, grouped, categorized);
    
    // Create filename with timestamp if not provided
    const exportFilename = filename || `migration-data-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Create and trigger download link
    const link = document.createElement("a");
    link.href = jsonUrl;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(jsonUrl);
    
    return true;
  } catch (error) {
    console.error("Error exporting credentials:", error);
    return false;
  }
};

/**
 * Validates credential data against expected schema
 * @param {Object} credential - Credential object to validate
 * @param {string} type - Type of credential to validate
 * @returns {Boolean} - Whether the credential is valid
 */
export const validateCredential = (credential, type = "generic") => {
  if (!credential || typeof credential !== "object") {
    return false;
  }
  
  switch (type) {
    case "ftp":
      return Boolean(credential.server && credential.username);
      
    case "website":
      return Boolean(credential.url && credential.username);
      
    case "domain":
      return Boolean(credential.domain);
      
    case "email":
      return Boolean(credential.email || (credential.username && credential.username.includes("@")));
      
    case "generic":
    default:
      // Generic credentials require at least a username
      return Boolean(credential.username);
  }
};

/**
 * Creates a CSV export of credentials
 * @param {Array} credentials - Array of credential objects to export
 * @param {Object} options - CSV options
 * @returns {string} - CSV content as a string
 */
export const exportCredentialsToCSV = (credentials, options = {}) => {
  if (!Array.isArray(credentials) || credentials.length === 0) {
    throw new Error("Brak danych do eksportu");
  }

  // Categorize credentials for separate sheets
  const categorized = categorizeMigrationData(credentials);
  
  const ftpCsv = createCsvForCredentialType(categorized.ftpAccounts, "ftp");
  const websitesCsv = createCsvForCredentialType(categorized.websites, "website");
  const domainsCsv = createCsvForCredentialType(categorized.domains, "domain");
  const emailCsv = createCsvForCredentialType(categorized.emailAccounts, "email");
  const genericCsv = createCsvForCredentialType(categorized.otherCredentials, "generic");
  
  // Return object with different CSV strings
  return {
    ftpCsv,
    websitesCsv,
    domainsCsv,
    emailCsv,
    genericCsv
  };
};

/**
 * Creates CSV content for a specific credential type
 * @param {Array} credentials - Credentials of a specific type
 * @param {string} type - Credential type
 * @returns {string} - CSV content
 */
const createCsvForCredentialType = (credentials, type) => {
  if (!credentials || credentials.length === 0) {
    return "";
  }
  
  let headers, rows;
  
  switch (type) {
    case "ftp":
      headers = ["Server", "Username", "Password", "Port", "Encryption"];
      rows = credentials.map(cred => [
        cred.server || "",
        cred.username || "",
        cred.password || "",
        cred.port || "21",
        cred.encryption || "FTP"
      ]);
      break;
      
    case "website":
      headers = ["URL", "Hostname", "Username", "Password", "CMS"];
      rows = credentials.map(cred => [
        cred.url || "",
        cred.hostname || "",
        cred.loginDetails?.username || "",
        cred.loginDetails?.password || "",
        cred.cms || ""
      ]);
      break;
      
    case "domain":
      headers = ["Domain", "Nameservers"];
      rows = credentials.map(cred => [
        cred.domain || "",
        (cred.nameservers || []).join(", ")
      ]);
      break;
      
    case "email":
      headers = ["Email", "Password", "Server", "IMAP Port", "SMTP Port", "POP3 Port"];
      rows = credentials.map(cred => [
        cred.email || "",
        cred.password || "",
        cred.serverConfiguration?.server || "",
        cred.serverConfiguration?.incomingServer?.imap?.port || "",
        cred.serverConfiguration?.outgoingServer?.smtp?.port || "",
        cred.serverConfiguration?.incomingServer?.pop3?.port || ""
      ]);
      break;
      
    case "generic":
    default:
      headers = ["Username", "Password", "System"];
      rows = credentials.map(cred => [
        cred.username || "",
        cred.password || "",
        cred.system || ""
      ]);
      break;
  }
  
  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  return csvContent;
};

/**
 * Merge multiple credential arrays and remove duplicates
 * @param {Array} credentialsArrays - Arrays of credentials to merge
 * @returns {Array} - Merged array without duplicates
 */
export const mergeCredentials = (...credentialsArrays) => {
  // Flatten arrays
  const allCredentials = [].concat(...credentialsArrays);
  
  // Create a set of unique keys to identify duplicates
  const uniqueKeys = new Set();
  const mergedCredentials = [];
  
  allCredentials.forEach(cred => {
    // Create a unique key based on the type of credential
    let uniqueKey;
    
    if (cred._type === "ftp" || cred.server) {
      uniqueKey = `ftp-${cred.server}-${cred.username}`;
    } else if (cred._type === "website" || cred.url) {
      uniqueKey = `website-${cred.url}-${cred.username}`;
    } else if (cred._type === "domain" || cred.domain) {
      uniqueKey = `domain-${cred.domain}`;
    } else if (cred._type === "email" || (cred.username && cred.username.includes("@"))) {
      uniqueKey = `email-${cred.email || cred.username}`;
    } else {
      uniqueKey = `generic-${cred.username}-${cred.system}`;
    }
    
    // Add to result if not a duplicate
    if (!uniqueKeys.has(uniqueKey)) {
      uniqueKeys.add(uniqueKey);
      mergedCredentials.push(cred);
    }
  });
  
  return mergedCredentials;
};

export default {
  groupCredentialsByClient,
  flattenGroupedCredentials,
  createJsonFile,
  exportCredentialsToJson,
  validateCredential,
  formatFTPAccount,
  formatWebsite,
  formatDomain,
  formatEmailAccount,
  formatGenericCredential,
  categorizeMigrationData,
  exportCredentialsToCSV,
  mergeCredentials
};