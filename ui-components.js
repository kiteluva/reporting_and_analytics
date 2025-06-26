// ui-components.js
// This file contains functions for displaying UI messages and prompts.

const overlay = document.getElementById('overlay');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageBoxOkBtn = messageBox ? messageBox.querySelector('button') : null;

// New elements for the prompt box
const promptBox = document.getElementById('promptBox');
const promptText = document.getElementById('promptText');
const promptInput = document.getElementById('promptInput');
const promptOkBtn = document.getElementById('promptOkBtn');
const promptCancelBtn = document.getElementById('promptCancelBtn');

let resolvePrompt; // To store the resolve function for the prompt promise

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 * @param {boolean} [isConfirm=false] - If true, displays OK/Cancel buttons for confirmation.
 * @param {Function} [onConfirmCallback] - Callback function if OK is pressed for a confirmation.
 */
export function showMessageBox(message, isConfirm = false, onConfirmCallback = null) {
    if (!messageBox || !overlay || !messageText) {
        console.error("MessageBox DOM elements not found. Falling back to alert.");
        alert(message); // Fallback if DOM elements aren't ready
        return;
    }

    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Remove any previous event listeners to prevent multiple firings
    if (messageBoxOkBtn) {
        messageBoxOkBtn.onclick = null;
        if (messageBoxOkBtn.nextElementSibling) { // If there's a cancel button, remove its listener too
            messageBoxOkBtn.nextElementSibling.onclick = null;
        }
    }


    if (isConfirm) {
        // Change button text and add a "Cancel" button if it's a confirmation
        messageBoxOkBtn.textContent = 'OK';
        let cancelButton = messageBoxOkBtn.nextElementSibling;
        if (!cancelButton || cancelButton.id !== 'messageBoxCancelBtn') {
            cancelButton = document.createElement('button');
            cancelButton.id = 'messageBoxCancelBtn';
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 ease-in-out ml-2';
            messageBoxOkBtn.parentNode.appendChild(cancelButton);
        }
        cancelButton.classList.remove('hidden'); // Ensure cancel button is visible

        messageBoxOkBtn.onclick = () => {
            hideMessageBox();
            if (onConfirmCallback) {
                onConfirmCallback();
            }
        };
        cancelButton.onclick = () => {
            hideMessageBox();
            // No callback for cancel in this simple message box
        };
    } else {
        // Revert to a single "OK" button for simple messages
        messageBoxOkBtn.textContent = 'OK';
        const cancelButton = document.getElementById('messageBoxCancelBtn');
        if (cancelButton) {
            cancelButton.classList.add('hidden'); // Hide the cancel button
        }
        messageBoxOkBtn.onclick = hideMessageBox;
    }
}

/**
 * Hides the message box.
 */
export function hideMessageBox() {
    if (messageBox) messageBox.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    // Ensure any prompt box is also hidden if the overlay is dismissed generally
    if (promptBox) promptBox.classList.add('hidden');
}


/**
 * Displays a custom prompt box to get user input.
 * @param {string} message - The message to display in the prompt.
 * @param {string} [defaultValue=''] - The default value for the input field.
 * @returns {Promise<string|null>} A promise that resolves with the user's input string, or null if cancelled.
 */
export function showPromptBox(message, defaultValue = '') {
    return new Promise(resolve => {
        if (!promptBox || !overlay || !promptText || !promptInput || !promptOkBtn || !promptCancelBtn) {
            console.error("PromptBox DOM elements not found. Falling back to window.prompt.");
            const result = prompt(message, defaultValue);
            resolve(result);
            return;
        }

        promptText.textContent = message;
        promptInput.value = defaultValue;
        promptInput.focus(); // Focus the input for user convenience

        // Clear previous listeners
        promptOkBtn.onclick = null;
        promptCancelBtn.onclick = null;

        // Display the prompt box
        promptBox.classList.remove('hidden');
        overlay.classList.remove('hidden');

        resolvePrompt = resolve; // Store the resolve function

        promptOkBtn.onclick = () => {
            hideMessageBox(); // This hides the overlay too
            resolvePrompt(promptInput.value);
        };

        promptCancelBtn.onclick = () => {
            hideMessageBox(); // This hides the overlay too
            resolvePrompt(null); // Resolve with null if cancelled
        };

        // Allow pressing Enter key to submit
        promptInput.onkeypress = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default Enter behavior (e.g., form submission)
                promptOkBtn.click(); // Trigger the OK button click
            }
        };
    });
}
