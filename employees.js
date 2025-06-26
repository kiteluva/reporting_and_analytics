// employees.js
// This file contains logic specific to employees.html

import { populateAxisSelects } from './charting.js';
import { showMessageBox } from './ui-components.js';
import { parsedData, headers } from './data-handlers.js'; // Import global data

// --- DOM Elements specific to employees.html ---
const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // Example: for employee filtering

/**
 * Initializes the UI and event listeners for the employees page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeEmployeesPage() {
    console.log("[Employees.js] Initializing employees page UI and listeners.");

    // The data (`parsedData`, `headers`) should already be loaded by main.js's initializeUIForCurrentPage
    if (parsedData.length > 0 && headers.length > 0) {
        populateAxisSelects(headers, parsedData); // Populate common axis selects from charting.js

        // Any employees-specific default selections or logic could go here.
        // Example: pre-select 'EmployeeName' for X-axis and 'Salary' for Y-axis if those columns exist.
        const xAxisSelect = document.getElementById('xAxisSelect');
        const yAxisSelect = document.getElementById('yAxisSelect');
        if (xAxisSelect && headers.includes('EmployeeName')) xAxisSelect.value = 'EmployeeName';
        if (yAxisSelect && headers.includes('Salary') && parsedData.some(row => typeof row.Salary === 'number')) yAxisSelect.value = 'Salary';

        // Example: Populate the xAxisFilterInput with unique employee names if it exists
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

    // --- Employees-specific Event Listeners (if any) ---
    // If changing the filter should re-plot automatically, add a listener here.
}

// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeEmployeesPage);
