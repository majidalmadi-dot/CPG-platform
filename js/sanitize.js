/**
 * XSS Sanitization & Safe DOM Manipulation Utilities
 * Provides HTML entity encoding, safe DOM element creation, and template-based HTML rendering
 * 
 * CRITICAL: Use these functions whenever inserting user-provided data into the DOM
 */

/**
 * Sanitizes HTML by encoding special characters to entities
 * Prevents <script> tag injection and event handler attacks
 * Does NOT remove tags - just encodes them so they display as text
 * 
 * @param {string} str - The string to sanitize (from user input, form fields, etc.)
 * @returns {string} - HTML entity-encoded string safe for innerHTML
 */
function sanitizeHTML(str) {
  // Handle null/undefined
  if (str === null || str === undefined) {
    return '';
  }
  
  // Convert to string in case a number is passed
  str = String(str);
  
  // Encode dangerous HTML entities
  // This prevents <script>, onclick, onload, etc. from being interpreted
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return str.replace(/[&<>"']/g, function(s) {
    return entityMap[s];
  });
}

/**
 * Creates a DOM element safely with attributes and children
 * Safely sets attributes to prevent attribute injection
 * 
 * @param {string} tag - HTML tag name (e.g., 'div', 'button')
 * @param {object} attrs - Attributes object {id: 'myid', class: 'btn', style: '...'}
 * @param {array|string} children - Array of children or string (text nodes)
 * @returns {HTMLElement} - The created DOM element
 */
function createElement(tag, attrs, children) {
  const element = document.createElement(tag);
  
  // Set attributes safely
  if (attrs && typeof attrs === 'object') {
    Object.keys(attrs).forEach(function(key) {
      const value = attrs[key];
      
      // Only set string/number attributes
      // Skip event handlers passed through attrs (use addEventListener instead)
      if (key.indexOf('on') === 0) {
        console.warn('Event handlers should not be set via createElement attrs. Use addEventListener instead.');
        return;
      }
      
      // For style, set via styleText or as object
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'style') {
        element.setAttribute(key, String(value));
      } else {
        element.setAttribute(key, String(value));
      }
    });
  }
  
  // Add children
  if (children) {
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(function(child) {
      if (typeof child === 'string') {
        // Create text node for strings (automatically escapes)
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        // Append DOM elements directly
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

/**
 * Safely inserts user data into an HTML template
 * Uses placeholders like {{memberName}} in template, replaces with sanitized user values
 * Preserves HTML structure tags (safe parts) while escaping user content
 * 
 * @param {HTMLElement} element - DOM element to set innerHTML on
 * @param {string} template - HTML template with {{placeholder}} markers
 * @param {object} userValues - Object of {placeholderName: userProvidedValue}
 * 
 * Example:
 *   safeSetHTML(
 *     document.getElementById('member-row'),
 *     '<td>{{memberName}}</td><td>{{email}}</td><td>{{role}}</td>',
 *     {memberName: 'Dr. Ahmed', email: 'ahmed@example.com', role: 'Chair'}
 *   )
 */
function safeSetHTML(element, template, userValues) {
  if (!element || !template) {
    return;
  }
  
  // Start with the template
  let html = template;
  
  // Replace each placeholder with sanitized user value
  if (userValues && typeof userValues === 'object') {
    Object.keys(userValues).forEach(function(key) {
      const userValue = userValues[key];
      const placeholder = '{{' + key + '}}';
      
      // Only replace if placeholder exists in template
      if (html.indexOf(placeholder) >= 0) {
        // Sanitize the user value before insertion
        const sanitized = sanitizeHTML(userValue);
        
        // Replace all occurrences of this placeholder
        // Use global regex to replace all instances
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        html = html.replace(regex, sanitized);
      }
    });
  }
  
  // Now set the safe HTML
  element.innerHTML = html;
}

/**
 * Safely renders a table row with user data
 * Commonly used pattern for member lists, recommendation tables, etc.
 * 
 * @param {object} userData - User data object with properties
 * @param {string} templateStr - Template with {{property}} placeholders
 * @returns {string} - Sanitized HTML ready for innerHTML
 */
function renderSafeTableRow(userData, templateStr) {
  let html = templateStr;
  
  if (userData && typeof userData === 'object') {
    Object.keys(userData).forEach(function(key) {
      const value = userData[key];
      const placeholder = '{{' + key + '}}';
      
      if (html.indexOf(placeholder) >= 0) {
        const sanitized = sanitizeHTML(value);
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        html = html.replace(regex, sanitized);
      }
    });
  }
  
  return html;
}

/**
 * Sanitizes multiple values at once (common pattern for form data)
 * Returns object with same keys but sanitized values
 * 
 * @param {object} dataObj - Object with potentially unsafe string values
 * @returns {object} - Same object structure with all values sanitized
 */
function sanitizeObject(dataObj) {
  const safe = {};
  
  if (!dataObj || typeof dataObj !== 'object') {
    return safe;
  }
  
  Object.keys(dataObj).forEach(function(key) {
    const value = dataObj[key];
    
    if (typeof value === 'string') {
      safe[key] = sanitizeHTML(value);
    } else {
      safe[key] = value;
    }
  });
  
  return safe;
}

/**
 * Safely concatenates HTML fragments with user data
 * Useful for building complex HTML strings incrementally
 * 
 * @param {array} parts - Array of strings/user values to concatenate
 * @param {boolean} shouldSanitize - Whether to sanitize each part (default: true)
 * @returns {string} - Safe HTML string
 */
function safeConcatHTML(parts, shouldSanitize) {
  if (!Array.isArray(parts)) {
    return '';
  }
  
  shouldSanitize = shouldSanitize !== false; // Default to true
  
  return parts.map(function(part) {
    if (typeof part === 'string' && shouldSanitize) {
      return sanitizeHTML(part);
    }
    return String(part || '');
  }).join('');
}

/**
 * Extracts user input from forms safely
 * Returns sanitized values ready for use in innerHTML
 * 
 * @param {array} fieldIds - Array of form field IDs to extract
 * @returns {object} - Object with {fieldId: sanitizedValue}
 */
function getFormDataSafe(fieldIds) {
  const data = {};
  
  if (!Array.isArray(fieldIds)) {
    return data;
  }
  
  fieldIds.forEach(function(fieldId) {
    const element = document.getElementById(fieldId);
    if (element) {
      const value = element.value || element.textContent || '';
      data[fieldId] = sanitizeHTML(value);
    }
  });
  
  return data;
}

// Export for use in Node/module environments if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeHTML: sanitizeHTML,
    createElement: createElement,
    safeSetHTML: safeSetHTML,
    renderSafeTableRow: renderSafeTableRow,
    sanitizeObject: sanitizeObject,
    safeConcatHTML: safeConcatHTML,
    getFormDataSafe: getFormDataSafe
  };
}