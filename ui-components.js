// ui-components.js
// This file contains general UI utility functions.

const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const overlay = document.getElementById('overlay');

/**
 * Displays a custom message box instead of alert().
 * Can also function as a confirmation dialog.
 * @param {string} message - The message to display.
 * @param {boolean} [isConfirm=false] - If true, adds a "Cancel" button and uses callbacks.
 * @param {function} [onConfirm=null] - Callback function for "OK" (or "Confirm") button.
 * @param {function} [onCancel=null] - Callback function for "Cancel" button.
 */
export function showMessageBox(message, isConfirm = false, onConfirm = null, onCancel = null) {
    if (!messageBox || !messageText || !overlay) {
        console.error("MessageBox DOM elements not found. Cannot show message.");
        alert(message); // Fallback to alert
        return;
    }

    messageText.textContent = message;
    messageBox.style.display = 'block';
    overlay.style.display = 'block';

    // Clear previous buttons
    messageBox.querySelectorAll('button').forEach(button => button.remove());

    const okButton = document.createElement('button');
    okButton.textContent = isConfirm ? 'Confirm' : 'OK';
    okButton.className = 'px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 ease-in-out';
    okButton.onclick = () => {
        hideMessageBox();
        if (onConfirm) onConfirm();
    };
    messageBox.appendChild(okButton);

    if (isConfirm) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'ml-4 px-4 py-2 bg-gray-400 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-300 ease-in-out';
        cancelButton.onclick = () => {
            hideMessageBox();
            if (onCancel) onCancel();
        };
        messageBox.appendChild(cancelButton);
    }
}

/**
 * Hides the custom message box.
 */
export function hideMessageBox() {
    if (messageBox) messageBox.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
}