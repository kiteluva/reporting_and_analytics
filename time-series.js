// time-series.js
// This file contains logic specific to time-series.html

import { populateAxisSelects } from './charting.js';
import { showMessageBox } from './ui-components.js';
import { parsedData, headers } from './data-handlers.js'; // Import global data

// --- DOM Elements specific to time-series.html ---
const startDateInput = document.getElementById('startDateInput');
const endDateInput = document.getElementById('endDateInput');

/**
 * Initializes the UI and event listeners for the time series page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeTimeSeriesPage() {
    console.log("[Time-Series.js] Initializing time series page UI and listeners.");

    // The data (`parsedData`, `headers`) should already be loaded by main.js's initializeUIForCurrentPage
    if (parsedData.length > 0 && headers.length > 0) {
        populateAxisSelects(headers, parsedData); // Populate common axis selects from charting.js

        // Any time-series-specific default selections or logic could go here.
        // Example: pre-select a 'Date' column for X-axis and a numeric 'Value' for Y-axis.
        const xAxisSelect = document.getElementById('xAxisSelect');
        const yAxisSelect = document.getElementById('yAxisSelect');
        if (xAxisSelect) {
            const dateHeaders = headers.filter(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time') || h.toLowerCase().includes('period'));
            if (dateHeaders.length > 0) xAxisSelect.value = dateHeaders[0];
        }
        if (yAxisSelect) {
            const numericHeaders = headers.filter(h => parsedData.some(row => typeof row[h] === 'number' && !isNaN(row[h])));
            if (numericHeaders.length > 0) yAxisSelect.value = numericHeaders[0];
        }

        // Example: Populate date range inputs with min/max dates if a date column is selected
        if (startDateInput && endDateInput && xAxisSelect && xAxisSelect.value) {
            const dateColumn = xAxisSelect.value;
            const dateValues = parsedData
                .map(row => new Date(row[dateColumn]))
                .filter(date => !isNaN(date.getTime())); // Filter out invalid dates

            if (dateValues.length > 0) {
                const minDate = new Date(Math.min(...dateValues)).toISOString().split('T')[0];
                const maxDate = new Date(Math.max(...dateValues)).toISOString().split('T')[0];
                startDateInput.value = minDate;
                endDateInput.value = maxDate;
            }
        }

    } else {
        showMessageBox("No data loaded. Please upload a CSV file on the Home page first.");
        // Hide page-specific elements if no data is loaded
        if (startDateInput) startDateInput.classList.add('hidden');
        if (endDateInput) endDateInput.classList.add('hidden');
    }

    // --- Time Series-specific Event Listeners (if any) ---
    // If changing dates should auto-replot:
    // const plotGraphBtn = document.getElementById('plotGraphBtn');
    // if (startDateInput) startDateInput.addEventListener('change', () => { if (plotGraphBtn) plotGraphBtn.click(); });
    // if (endDateInput) endDateInput.addEventListener('change', () => { if (plotGraphBtn) plotGraphBtn.click(); });
}

// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeTimeSeriesPage);
