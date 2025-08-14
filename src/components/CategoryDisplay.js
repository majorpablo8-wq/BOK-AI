import React, { useState } from "react";

/**
 * CategoryDisplay component for displaying credential categories with copy-to-clipboard functionality
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the credential category
 * @param {string} props.icon - Icon name for the category
 * @param {string} props.color - Color theme for the category
 * @param {Array} props.items - Array of credential items to display
 * @param {Function} props.onItemSelect - Function to handle when an item is selected
 * @param {Object} props.fields - Configuration for which fields to display
 */
const CategoryDisplay = ({ 
  title, 
  icon, 
  color = "blue", 
  items = [], 
  onItemSelect, 
  fields = {
    username: true,
    password: true,
    server: true,
    url: false,
    domain: false,
    email: false,
    nameservers: false
  },
  selectedItems = [],
  showCheckboxes = true
}) => {
  const [copiedField, setCopiedField] = useState(null);
  
  // Handle copy to clipboard functionality
  const copyToClipboard = (text, fieldId) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Set the copied field to show feedback
        setCopiedField(fieldId);
        
        // Reset the copied field after 2 seconds
        setTimeout(() => {
          setCopiedField(null);
        }, 2000);
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
      });
  };
  
  // Handle checkbox selection
  const handleCheckboxChange = (item) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  };
  
  // Get category color classes
  const getColorClasses = () => {
    switch (color) {
      case "blue":
        return {
          header: "bg-blue-50 border-blue-200 text-blue-700",
          icon: "text-blue-500 bg-blue-100",
          item: "border-blue-100 hover:bg-blue-50",
          button: "text-blue-600 hover:text-blue-800"
        };
      case "green":
        return {
          header: "bg-green-50 border-green-200 text-green-700",
          icon: "text-green-500 bg-green-100",
          item: "border-green-100 hover:bg-green-50",
          button: "text-green-600 hover:text-green-800"
        };
      case "purple":
        return {
          header: "bg-purple-50 border-purple-200 text-purple-700",
          icon: "text-purple-500 bg-purple-100",
          item: "border-purple-100 hover:bg-purple-50",
          button: "text-purple-600 hover:text-purple-800"
        };
      case "amber":
        return {
          header: "bg-amber-50 border-amber-200 text-amber-700",
          icon: "text-amber-500 bg-amber-100",
          item: "border-amber-100 hover:bg-amber-50",
          button: "text-amber-600 hover:text-amber-800"
        };
      case "red":
        return {
          header: "bg-red-50 border-red-200 text-red-700",
          icon: "text-red-500 bg-red-100",
          item: "border-red-100 hover:bg-red-50",
          button: "text-red-600 hover:text-red-800"
        };
      default:
        return {
          header: "bg-gray-50 border-gray-200 text-gray-700",
          icon: "text-gray-500 bg-gray-100",
          item: "border-gray-100 hover:bg-gray-50",
          button: "text-gray-600 hover:text-gray-800"
        };
    }
  };
  
  const colorClasses = getColorClasses();
  
  // Get appropriate icon for the category
  const renderCategoryIcon = () => {
    switch (icon) {
      case "ftp":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case "website":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
          </svg>
        );
      case "domain":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
        );
      case "email":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case "database":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1 .257-.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  // Render field with copy button
  const renderField = (label, value, item, field) => {
    if (!value) return null;
    
    const fieldId = `${field}-${item.id || Math.random().toString(36).substr(2, 9)}`;
    const isPassword = field === "password";
    
    return (
      <div className="flex flex-col mb-2">
        <span className="text-xs text-gray-500">{label}:</span>
        <div className="flex items-center">
          {isPassword ? (
            <span className="password-mask">••••••••</span>
          ) : (
            <span className="text-sm font-medium break-all">{value}</span>
          )}
          <div className="ml-2 flex items-center">
            {isPassword && (
              <button
                className={`mr-1 ${colorClasses.button}`}
                onClick={() => alert(`${label}: ${value}`)}
                title="Pokaż hasło"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <button
              className={`${colorClasses.button} ${copiedField === fieldId ? "text-green-500" : ""}`}
              onClick={() => copyToClipboard(value, fieldId)}
              title={copiedField === fieldId ? "Skopiowano!" : "Kopiuj"}
            >
              {copiedField === fieldId ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render array field (like nameservers)
  const renderArrayField = (label, array, item, field) => {
    if (!array || array.length === 0) return null;
    
    const fieldId = `${field}-${item.id || Math.random().toString(36).substr(2, 9)}`;
    const arrayString = array.join(", ");
    
    return (
      <div className="flex flex-col mb-2">
        <span className="text-xs text-gray-500">{label}:</span>
        <div className="flex items-center">
          <span className="text-sm font-medium break-all">{arrayString}</span>
          <button
            className={`ml-2 ${colorClasses.button} ${copiedField === fieldId ? "text-green-500" : ""}`}
            onClick={() => copyToClipboard(arrayString, fieldId)}
            title={copiedField === fieldId ? "Skopiowano!" : "Kopiuj"}
          >
            {copiedField === fieldId ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  // Check if an item is selected
  const isItemSelected = (item) => {
    return selectedItems.some(selectedItem => {
      return selectedItem.id === item.id || 
        (selectedItem.username === item.username && 
         selectedItem.server === item.server);
    });
  };

  // If no items, show empty state
  if (items.length === 0) {
    return (
      <div className={`mb-6 rounded-lg border ${colorClasses.header} p-4`}>
        <div className="flex items-center mb-2">
          <div className={`rounded-full p-2 ${colorClasses.icon}`}>
            {renderCategoryIcon()}
          </div>
          <h3 className="font-semibold ml-2">{title}</h3>
        </div>
        <p className="text-gray-500 text-sm">Brak danych dla tej kategorii.</p>
      </div>
    );
  }
  
  return (
    <div className={`mb-6 rounded-lg border ${colorClasses.header}`}>
      <div className="flex items-center p-4">
        <div className={`rounded-full p-2 ${colorClasses.icon}`}>
          {renderCategoryIcon()}
        </div>
        <h3 className="font-semibold ml-2">{title}</h3>
        <span className="ml-2 bg-white text-gray-600 text-xs px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>
      
      <div className="divide-y divide-gray-200 bg-white rounded-b-lg">
        {items.map((item, index) => (
          <div 
            key={item.id || index} 
            className={`p-4 ${colorClasses.item} ${index === items.length - 1 ? "rounded-b-lg" : ""}`}
          >
            <div className="flex items-start">
              {showCheckboxes && (
                <div className="mr-3 mt-1">
                  <input
                    type="checkbox"
                    checked={isItemSelected(item)}
                    onChange={() => handleCheckboxChange(item)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div className="flex-grow">
                {fields.username && renderField("Login", item.username, item, "username")}
                {fields.password && renderField("Hasło", item.password, item, "password")}
                {fields.email && renderField("Email", item.email, item, "email")}
                {fields.server && renderField("Serwer", item.server, item, "server")}
                {fields.url && renderField("URL", item.url, item, "url")}
                {fields.domain && renderField("Domena", item.domain, item, "domain")}
                {fields.nameservers && renderArrayField("Serwery DNS", item.nameservers, item, "nameservers")}
                
                {/* Port information for email/FTP */}
                {item.imapPort && renderField("Port IMAP", item.imapPort, item, "imapPort")}
                {item.smtpPort && renderField("Port SMTP", item.smtpPort, item, "smtpPort")}
                {item.popPort && renderField("Port POP3", item.popPort, item, "popPort")}
                {(item.port && !item.imapPort && !item.smtpPort && !item.popPort) && 
                  renderField("Port", item.port, item, "port")}
                
                {/* Additional fields for websites */}
                {item.cmsType && renderField("System CMS", item.cmsType, item, "cmsType")}
                {item.loginUrl && renderField("URL logowania", item.loginUrl, item, "loginUrl")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryDisplay;