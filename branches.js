// branches.js
// This file contains logic specific to branches.html

import { populateAxisSelects } from './charting.js';
import { showMessageBox } from './ui-components.js';
import { parsedData, headers } from './data-handlers.js'; // Import global data

// --- DOM Elements specific to branches.html ---
const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // Example: for branch filtering

/**
 * Initializes the UI and event listeners for the branches page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeBranchesPage() {
    console.log("[Branches.js] Initializing branches page UI and listeners.");

    // The data (`parsedData`, `headers`) should already be loaded by main.js's initializeUIForCurrentPage
    if (parsedData.length > 0 && headers.length > 0) {
        populateAxisSelects(headers, parsedData); // Populate common axis selects from charting.js

        // Any branches-specific default selections or logic could go here.
        // Example: pre-select 'Branch' for X-axis and 'Sales' for Y-axis if those columns exist.
        const xAxisSelect = document.getElementById('xAxisSelect');
        const yAxisSelect = document.getElementById('yAxisSelect');
        if (xAxisSelect && headers.includes('Branch')) xAxisSelect.value = 'Branch';
        if (yAxisSelect && headers.includes('Sales') && parsedData.some(row => typeof row.Sales === 'number')) yAxisSelect.value = 'Sales';

        // Example: Populate the xAxisFilterInput with unique branch names if it exists
        if (xAxisFilterInput && xAxisSelect.value) {
            const uniqueValues = [...new Set(parsedData.map(row => String(row[xAxisSelect.value]).trim()))]
                                .filter(val => val !== '').sort();
            xAxisFilterInput.value = uniqueValues.join(', ');
        }

    } else {
        showMessageBox("No data loaded. Please upload a CSV file on the Home page first.");
        // Hide page-specific elements if no data is loaded
        if (xAxisFilterInput) xAxisFilterInput.classList.add('hidden');
    }

    // --- Branches-specific Event Listeners (if any) ---
    // If changing the filter should re-plot automatically, add a listener here.
    // Otherwise, the main "Plot Graph" button will use the filter value when clicked.
    // Example:
    // if (xAxisFilterInput) {
    //     xAxisFilterInput.addEventListener('change', () => {
    //         const plotGraphBtn = document.getElementById('plotGraphBtn');
    //         if (plotGraphBtn) plotGraphBtn.click(); // Trigger re-plot
    //     });
    // }
}

// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeBranchesPage);
