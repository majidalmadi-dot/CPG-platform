/**
 * Modal Module - Reusable Modal Dialog System
 * Provides utilities for creating, managing, and displaying modal dialogs
 * with focus trapping, keyboard accessibility, and stacking support.
 */

// Modal stack to manage multiple modals
var _modalStack = [];

/**
 * Creates and shows a modal dialog with customizable content and styling.
 * 
 * @param {Object} options - Modal configuration object
 * @param {string} options.title - Modal title (displayed in header)
 * @param {string} options.content - HTML content for the modal body
 * @param {string} [options.color='#7C3AED'] - Accent color for top border
 * @param {string} [options.maxWidth='700px'] - Maximum width of modal
 * @param {string} [options.ariaLabel] - Accessible label (defaults to title)
 * @param {Array} [options.actions] - Footer action buttons
 * @param {string} options.actions[].label - Button text
 * @param {string} [options.actions[].class='btn btn-p'] - CSS classes
 * @param {Function} options.actions[].onclick - Click handler function
 * @param {Function} [options.onClose] - Callback when modal is closed
 * @param {boolean} [options.closeOnBackdropClick=true] - Allow closing by clicking overlay
 * @param {boolean} [options.closeOnEscape=true] - Allow closing with Escape key
 * 
 * @returns {HTMLElement} The modal overlay element
 */
function showModal(options) {
  if (!options || !options.content) {
    console.error('showModal: options.content is required');
    return null;
  }

  var title = options.title || 'Dialog';
  var content = options.content || '';
  var color = options.color || '#7C3AED';
  var maxWidth = options.maxWidth || '700px';
  var ariaLabel = options.ariaLabel || title;
  var actions = options.actions || [];
  var onClose = options.onClose || null;
  var closeOnBackdropClick = options.closeOnBackdropClick !== false;
  var closeOnEscape = options.closeOnEscape !== false;

  // Create overlay (backdrop)
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
    'background:rgba(0,0,0,0.5);z-index:' + (10000 + _modalStack.length) + ';' +
    'display:flex;align-items:center;justify-content:center;' +
    'animation:modalFadeIn 0.2s ease-out;';

  // Create modal container
  var modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', ariaLabel);
  modal.style.cssText = 'position:relative;background:#fff;border-radius:12px;' +
    'padding:0;max-width:' + maxWidth + ';width:95%;max-height:85vh;' +
    'overflow-y:auto;border-top:4px solid ' + color + ';' +
    'box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);' +
    'animation:modalScaleIn 0.3s cubic-bezier(0.16,1,0.3,1);';

  // Header with title and close button
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
    'padding:20px 24px;border-bottom:1px solid #E5E7EB;flex-shrink:0;';
  
  var titleEl = document.createElement('h2');
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin:0;font-size:18px;font-weight:700;color:#1F2937;';
  header.appendChild(titleEl);

  var closeBtn = document.createElement('button');
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.style.cssText = 'background:none;border:none;font-size:24px;' +
    'color:#6B7280;cursor:pointer;padding:0;width:32px;height:32px;' +
    'display:flex;align-items:center;justify-content:center;' +
    'border-radius:6px;transition:all 0.2s ease;';
  closeBtn.textContent = '×';
  closeBtn.onmouseover = function() { this.style.background = '#F3F4F6'; };
  closeBtn.onmouseout = function() { this.style.background = 'none'; };
  header.appendChild(closeBtn);

  // Body content
  var body = document.createElement('div');
  body.style.cssText = 'padding:24px;overflow-y:auto;flex:1;';
  body.innerHTML = content;

  modal.appendChild(header);
  modal.appendChild(body);

  // Footer with action buttons (if provided)
  if (actions && actions.length > 0) {
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;' +
      'padding:16px 24px;border-top:1px solid #E5E7EB;flex-shrink:0;';

    actions.forEach(function(action) {
      var btn = document.createElement('button');
      btn.textContent = action.label || 'Button';
      btn.className = action.class || 'btn btn-p';
      btn.style.cssText = (btn.style.cssText || '') + ';margin:0;';
      
      btn.onclick = function(e) {
        if (action.onclick) {
          action.onclick.call(this, e, modal, overlay);
        }
      };
      
      footer.appendChild(btn);
    });

    modal.appendChild(footer);
  }

  overlay.appendChild(modal);

  // Close function
  function closeModal() {
    if (modal.style.animation) {
      modal.style.animation = 'modalScaleOut 0.2s cubic-bezier(0.7,0,0.84,0) forwards';
      overlay.style.animation = 'modalFadeOut 0.2s ease-in forwards';
      setTimeout(function() {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        _modalStack = _modalStack.filter(function(m) { return m !== overlay; });
        if (onClose) { onClose(); }
      }, 200);
    } else {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      _modalStack = _modalStack.filter(function(m) { return m !== overlay; });
      if (onClose) { onClose(); }
    }
  }

  // Close button handler
  closeBtn.onclick = closeModal;

  // Backdrop click handler
  if (closeOnBackdropClick) {
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        closeModal();
      }
    };
  }

  // Keyboard handler (Escape key)
  var escapeHandler = function(e) {
    if (closeOnEscape && e.key === 'Escape' && _modalStack[_modalStack.length - 1] === overlay) {
      closeModal();
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Store reference to handler for cleanup
  overlay._escapeHandler = escapeHandler;

  // Add to body and modal stack
  document.body.appendChild(overlay);
  _modalStack.push(overlay);

  // Focus management
  _trapFocus(modal);

  return overlay;
}

/**
 * Creates and shows a confirmation dialog.
 * 
 * @param {string} message - Confirmation message to display
 * @param {Function} onConfirm - Callback function when user confirms
 * @param {Object} [options] - Additional modal options (title, color, etc.)
 * @returns {HTMLElement} The modal overlay element
 */
function showConfirm(message, onConfirm, options) {
  options = options || {};
  
  var confirmOptions = {
    title: options.title || 'Confirm',
    content: '<p style="margin:0;color:#4B5563;line-height:1.6;">' + 
      (message || 'Are you sure?') + '</p>',
    color: options.color || '#F59E0B',
    maxWidth: options.maxWidth || '450px',
    ariaLabel: options.ariaLabel || 'Confirmation dialog',
    actions: [
      {
        label: 'Cancel',
        class: 'btn btn-o',
        onclick: function() { /* just close */ }
      },
      {
        label: 'Confirm',
        class: 'btn btn-p',
        onclick: function(e, modal, overlay) {
          if (onConfirm) { onConfirm(); }
        }
      }
    ],
    closeOnBackdropClick: options.closeOnBackdropClick !== false,
    closeOnEscape: options.closeOnEscape !== false
  };

  return showModal(confirmOptions);
}

/**
 * Shows a loading/progress modal with a message that can be updated.
 * 
 * @param {string} title - Modal title
 * @param {string} message - Initial loading message
 * @returns {Object} Object with methods to control the loading modal
 * @returns {HTMLElement} returns.modal - The modal overlay element
 * @returns {Function} returns.updateProgress - Update the progress message
 * @returns {Function} returns.close - Close the loading modal
 */
function showProgress(title, message) {
  title = title || 'Processing...';
  message = message || 'Please wait...';

  var contentId = 'progress-content-' + Date.now();
  
  var overlay = showModal({
    title: title,
    content: '<div id="' + contentId + '" style="text-align:center;color:#6B7280;' +
      'padding:20px 0;">' + message + '</div>' +
      '<div style="display:flex;justify-content:center;margin:20px 0;">' +
      '<div style="width:40px;height:40px;border:3px solid #E5E7EB;' +
      'border-top-color:#7C3AED;border-radius:50%;animation:spin 1s linear infinite;"></div>' +
      '</div>',
    color: '#3B82F6',
    closeOnBackdropClick: false,
    closeOnEscape: false
  });

  var contentEl = document.getElementById(contentId);

  return {
    modal: overlay,
    updateProgress: function(newMessage) {
      if (contentEl && document.body.contains(contentEl)) {
        contentEl.textContent = newMessage;
      }
    },
    close: function() {
      var closeBtn = overlay.querySelector('button[aria-label="Close dialog"]');
      if (closeBtn) { closeBtn.click(); }
    }
  };
}

/**
 * Closes the topmost (most recent) modal from the stack.
 * Useful for programmatic modal dismissal.
 * 
 * @returns {boolean} True if a modal was closed, false if no modals in stack
 */
function closeTopModal() {
  if (_modalStack.length === 0) { return false; }

  var topModal = _modalStack[_modalStack.length - 1];
  var closeBtn = topModal.querySelector('button[aria-label="Close dialog"]');
  
  if (closeBtn) {
    closeBtn.click();
    return true;
  }
  return false;
}

/**
 * Gets the count of currently open modals.
 * 
 * @returns {number} Number of open modals
 */
function getOpenModalCount() {
  return _modalStack.length;
}

/**
 * Trap focus within a modal element (accessibility feature).
 * Prevents tab key from moving focus outside the modal.
 * 
 * @private
 * @param {HTMLElement} element - Modal element to trap focus in
 */
function _trapFocus(element) {
  var focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) { return; }

  var firstElement = focusableElements[0];
  var lastElement = focusableElements[focusableElements.length - 1];

  // Focus first element on open
  setTimeout(function() {
    if (firstElement) { firstElement.focus(); }
  }, 100);

  var tabHandler = function(e) {
    if (e.key !== 'Tab') { return; }

    if (e.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  element.addEventListener('keydown', tabHandler);
  element._focusTrapHandler = tabHandler;
}

/**
 * Add CSS animations if not already present in the page.
 * Called automatically on first modal creation.
 */
(function injectStyles() {
  var styleId = 'modal-animations';
  if (document.getElementById(styleId)) { return; }

  var style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes modalScaleIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes modalScaleOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
      }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();
