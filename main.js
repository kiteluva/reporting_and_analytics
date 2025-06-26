// main.js
// This file orchestrates the application logic, imports modules, and sets up global event listeners.

import {
    openDatabase,
    loadDataFromIndexedDB,
    clearCSVDataFromIndexedDB,
    saveActivePlotConfig,
    loadActivePlotConfig,
    clearActivePlotConfig,
    saveSavedChart,
    loadSavedCharts,
    clearAllSavedCharts,
    deleteSavedChartById,
    parsedData, // Directly import parsedData from data-handlers.js
    headers     // Directly import headers from data-handlers.js
} from './data-handlers.js';

import {
    populateAxisSelects,
    drawChart,
    renderSavedChartsTable,
    loadSavedChart,
    clearChartInstances
} from './charting.js';

import { showMessageBox, hideMessageBox } from './ui-components.js';

// --- DOM Elements (Universal / Main App) ---
// Note: csvFileInput and fileNameDisplay are moved to home.js as they are specific to home.html
const plotGraphBtn = document.getElementById('plotGraphBtn');
const getInsightsBtn = document.getElementById('getInsightsBtn');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');
const clearAllSavedGraphsBtn = document.getElementById('clearAllSavedGraphsBtn');
const saveGraphBtn = document.getElementById('saveGraphBtn');
const exportGraphBtn = document.getElementById('exportGraphBtn');

// Elements that might be present on specific pages (but their direct manipulation will be in page-specific JS)
// Moved from here: dataHeadSection, dataHeadTable, descriptiveStatisticsSection, statisticsTable, columnDistributionSection, distributionColumnSelect, distributionChartCanvas, showDataOverviewBtn, showPlottingSectionBtn
// These are now handled by their respective page-specific JS files.

const myChartCanvas = document.getElementById('myChartCanvas'); // Main canvas for plotting on plot pages
const xAxisSelect = document.getElementById('xAxisSelect');
const yAxisSelect = document.getElementById('yAxisSelect');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');

const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // For Branches/Employees
const startDateInput = document.getElementById('startDateInput'); // For Time Series
const endDateInput = document.getElementById('endDateInput'); // For Time Series

const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentGraphDescription = document.getElementById('recentGraphDescription');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas');

const savedGraphsSection = document.getElementById('savedGraphsSection');
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody');

const viewedSavedGraphSection = document.getElementById('viewedSavedGraphSection');
const viewedGraphDescription = document.getElementById('viewedGraphDescription');
const viewedSavedChartCanvas = document.getElementById('viewedSavedChartCanvas');

const insightsOutput = document.getElementById('insightsOutput');
const insightsText = document.getElementById('insightsText');
const insightsLoading = document.getElementById('insightsLoading');


// --- Global Data Variables (now strictly imported from data-handlers.js) ---
// No longer 'export let globalParsedData = []' here.
// 'parsedData' and 'headers' are imported directly from './data-handlers.js' and will be updated there.


// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./worker.js')
            .then(registration => {
                console.log('[Service Worker] Registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('[Service Worker] Registration failed:', error);
            });
    });
}

// --- Initialization Functions ---

/**
 * Initializes the UI based on the current HTML page.
 * Hides/shows relevant sections and populates dropdowns.
 * This function also triggers the loading of data from IndexedDB.
 */
async function initializeUIForCurrentPage() {
    console.log("[Main] Initializing UI for current page...");
    const currentPage = window.location.pathname.split('/').pop();

    // Hide all main content sections by default and then show only relevant ones
    document.querySelectorAll('.main-content-area > div').forEach(section => {
        // Exclude messageBox, overlay, navigationBar from being hidden by default
        if (section.id !== 'messageBox' && section.id !== 'overlay' && section.id !== 'navigationBar') {
             section.classList.add('hidden');
        }
    });

    // Elements for general plotting sections (common to branches, employees, time-series, complex_stats, and home after upload)
    const commonPlottingElements = [
        document.getElementById('plottingControlsSection'),
        myChartCanvas,
        mostRecentGraphSection,
        savedGraphsSection,
        plotGraphBtn,
        saveGraphBtn,
        exportGraphBtn,
        getInsightsBtn,
        insightsOutput
    ];

    // Immediately show universally expected elements if they exist
    // Navigation bar is handled in HTML directly. messageBox and overlay handled by ui-components.
    // We assume the main-content-area container itself is always visible.

    switch (currentPage) {
        case 'home.html':
            // Home page specific UI setup will be handled by home.js
            // This ensures home.js controls its unique elements like file input, data tables.
            // main.js will still trigger loadDataFromIndexedDB via initializeUIForCurrentPage on all pages.
            // The `if (loaded && loaded.parsedData.length > 0)` block below will then populate universals.
            break;
        case 'branches.html':
        case 'employees.html':
        case 'time-series.html':
        case 'complex_stats.html':
            // For these analysis pages, common plotting/insights sections are generally visible
            commonPlottingElements.forEach(el => el && el.classList.remove('hidden'));
            break;
        default:
            console.warn("Unknown page:", currentPage);
            break;
    }

    await openDatabase(); // Ensure IndexedDB is open
    const loadedData = await loadDataFromIndexedDB(); // This updates the `parsedData` and `headers` exports in data-handlers.js

    if (loadedData && parsedData.length > 0) { // Check the imported `parsedData` from data-handlers
        console.log("[Main] Global data loaded from IndexedDB. Data points:", parsedData.length, "Headers:", headers.length);
        // fileNameDisplay is now handled in home.js when on home page
        populateAxisSelects(headers, parsedData); // Use imported headers and parsedData
        renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);

        const currentPageId = window.location.pathname.split('/').pop();
        const activePlot = await loadActivePlotConfig(currentPageId);
        if (activePlot) {
            console.log(`[IndexedDB] Loaded active plot config for ${currentPageId}:`, activePlot);
            if (xAxisSelect) xAxisSelect.value = activePlot.xAxisColumn;
            if (yAxisSelect) yAxisSelect.value = activePlot.yAxisColumn;
            if (chartTypeSelect) chartTypeSelect.value = activePlot.chartType;
            if (yAxisAggregationSelect) yAxisAggregationSelect.value = activePlot.yAxisAggregation;

            // Restore page-specific filter inputs
            if (activePlot.xAxisFilterValue && xAxisFilterInput) {
                xAxisFilterInput.value = activePlot.xAxisFilterValue;
            }
            if (activePlot.startDate && startDateInput) {
                startDateInput.value = activePlot.startDate;
            }
            if (activePlot.endDate && endDateInput) {
                endDateInput.value = activePlot.endDate;
            }

            drawChart(
                myChartCanvas,
                xAxisSelect,
                yAxisSelect,
                chartTypeSelect,
                yAxisAggregationSelect,
                xAxisFilterInput,
                startDateInput,
                endDateInput,
                parsedData, // Use imported parsedData
                headers,    // Use imported headers
                showMessageBox,
                saveGraphBtn,
                exportGraphBtn,
                recentGraphDescription,
                recentSavedChartCanvas
            );
        } else {
             // If no active plot config, draw an initial default chart or clear
            drawChart(
                myChartCanvas,
                xAxisSelect,
                yAxisSelect,
                chartTypeSelect,
                yAxisAggregationSelect,
                xAxisFilterInput,
                startDateInput,
                endDateInput,
                parsedData, // Use imported parsedData
                headers,    // Use imported headers
                showMessageBox,
                saveGraphBtn,
                exportGraphBtn,
                recentGraphDescription,
                recentSavedChartCanvas
            );
        }

    } else {
        console.log("No data loaded from IndexedDB or data is empty. Resetting universal UI.");
        resetUniversalUI(); // Call the reset for universal elements
        // Page-specific resets (e.g., filename display on home.html) should be handled by their own scripts.
    }
}


/**
 * Resets the universal UI components to their initial state when no CSV data is loaded.
 * This does not include page-specific elements like file input or data tables on home.html.
 */
function resetUniversalUI() {
    console.log("[Main] Resetting universal UI components.");
    clearChartInstances(); // From charting.js

    // Reset universal selects
    if (xAxisSelect) xAxisSelect.innerHTML = '<option value="">Select X-Axis</option>';
    if (yAxisSelect) yAxisSelect.innerHTML = '<option value="">Select Y-Axis</option>';
    if (chartTypeSelect) chartTypeSelect.value = 'bar';
    if (yAxisAggregationSelect) yAxisAggregationSelect.value = 'average';

    // Hide universal charting/insights sections that become active with data
    if (myChartCanvas) {
        const ctx = myChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, myChartCanvas.width, myChartCanvas.height);
    }
    if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
    if (recentGraphDescription) recentGraphDescription.textContent = '';
    if (saveGraphBtn) saveGraphBtn.classList.add('hidden');
    if (exportGraphBtn) exportGraphBtn.classList.add('hidden');

    // Hide and clear saved graph view
    if (viewedSavedChartInstance) {
        viewedSavedChartInstance.destroy();
        viewedSavedChartInstance = null;
    }
    if (viewedSavedGraphSection) {
        viewedSavedGraphSection.classList.add('hidden');
        if (viewedGraphDescription) viewedGraphDescription.textContent = '';
    }

    // Clear insights output
    if (insightsOutput) insightsOutput.classList.add('hidden');
    if (insightsText) insightsText.textContent = '';
    if (insightsLoading) insightsLoading.classList.add('hidden');

    // Re-render saved charts table with empty data
    if (savedGraphsTableBody) { // Check if element exists before passing
         renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
    }

    // Clear universal page-specific inputs that might exist across multiple plotting pages
    if (xAxisFilterInput) xAxisFilterInput.value = '';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    console.log("[Main] Universal UI reset complete.");
}


// --- Global Event Listeners (Universal) ---

// Listener for plotting a graph (available on any page with plotting controls)
if (plotGraphBtn) {
    plotGraphBtn.addEventListener('click', async () => {
        if (!parsedData || parsedData.length === 0) { // Use imported parsedData
            showMessageBox('No data loaded. Please upload a CSV file on the Home page first.');
            return;
        }

        if (!xAxisSelect.value || !yAxisSelect.value || !chartTypeSelect.value) {
            showMessageBox('Please select X-Axis, Y-Axis, and Chart Type.');
            return;
        }

        drawChart(
            myChartCanvas,
            xAxisSelect,
            yAxisSelect,
            chartTypeSelect,
            yAxisAggregationSelect,
            xAxisFilterInput, // May be null on some pages, handle gracefully in drawChart
            startDateInput,   // May be null
            endDateInput,     // May be null
            parsedData, // Use imported parsedData
            headers,    // Use imported headers
            showMessageBox,
            saveGraphBtn,
            exportGraphBtn,
            recentGraphDescription,
            recentSavedChartCanvas
        );

        // Save active plot configuration for the current page
        const currentPageId = window.location.pathname.split('/').pop();
        await saveActivePlotConfig(currentPageId, {
            xAxisColumn: xAxisSelect.value,
            yAxisColumn: yAxisSelect.value,
            chartType: chartTypeSelect.value,
            yAxisAggregation: yAxisAggregationSelect.value,
            // Include page-specific filters if present
            xAxisFilterValue: xAxisFilterInput ? xAxisFilterInput.value : undefined,
            startDate: startDateInput ? startDateInput.value : undefined,
            endDate: endDateInput ? endDateInput.value : undefined
        });
        console.log(`[IndexedDB] Active plot config saved for ${currentPageId}`);
    });
}

// Listener for Get Data Insights button (universal)
if (getInsightsBtn) {
    getInsightsBtn.addEventListener('click', async () => {
        if (!parsedData || parsedData.length === 0) { // Use imported parsedData
            showMessageBox('No data loaded. Please upload a CSV file and load data before getting insights.');
            return;
        }

        if (insightsOutput) insightsOutput.classList.remove('hidden');
        if (insightsText) insightsText.textContent = '';
        if (insightsLoading) insightsLoading.classList.remove('hidden');

        // Placeholder for actual AI integration
        const apiKey = "AIzaSyAjF5n8EStCsR8U3xiO2qnIkOLbsRhhONU"; // Your API key would go here
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // In a real application, youd send `parsedData` and `headers` to a backend AI service
        // For demonstration, let's simulate a delay and provide a dummy insight
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call delay

        let insightMessage = "Based on the loaded CSV data, initial observations can be made. This is a placeholder for detailed AI-driven insights that would analyze trends, anomalies, and correlations based on your dataset and the current plot configuration if available.";

        if (myChartCanvas && myChartCanvas.chartInstance) {
            insightMessage += `\\n\\nCurrent plot shows \"${myChartCanvas.chartInstance.options.plugins.title.text}\". A deeper analysis might reveal specific patterns related to \"${myChartCanvas.chartInstance.options.scales.x.title.text.text}\" and \"${myChartCanvas.chartInstance.options.scales.y.title.text.text}\".`;
        }

        if (insightsText) insightsText.textContent = insightMessage;
        if (insightsLoading) insightsLoading.classList.add('hidden');
    });
}

// Listener for Clear All Data Button (universal)
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', () => {
        showMessageBox(
            'Are you sure you want to clear all loaded CSV data and active plot configurations from your browser storage?',
            true, // isConfirm
            async () => {
                await clearCSVDataFromIndexedDB(); // This will also reset parsedData and headers in data-handlers.js
                await clearAllSavedCharts();
                // Clear active plot configs for all known pages
                await clearActivePlotConfig('home.html');
                await clearActivePlotConfig('branches.html');
                await clearActivePlotConfig('employees.html');
                await clearActivePlotConfig('time-series.html');
                await clearActivePlotConfig('complex_stats.html');

                resetUniversalUI(); // Reset universal UI elements
                // Page-specific UI elements should be reset by their own page JS (e.g., home.js's resetHomeUI)
                // Trigger re-initialization of the current page to reflect the cleared state
                initializeUIForCurrentPage();
                showMessageBox('All data cleared successfully!', false);
                console.log("[IndexedDB] All CSV data and active plots cleared.");
            }
        );
    });
}


// Listener for Clear All Saved Graphs Button (universal)
if (clearAllSavedGraphsBtn) {
    clearAllSavedGraphsBtn.addEventListener('click', () => {
        showMessageBox(
            'Are you sure you want to clear all saved charts from your browser storage? This action cannot be undone.',
            true, // isConfirm
            async () => {
                await clearAllSavedCharts();
                renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById); // Re-render table with empty data
                showMessageBox('All saved charts cleared successfully!', false);
                console.log("[IndexedDB] All saved charts cleared.");
                // Also hide the viewed saved graph section if it was showing a deleted chart
                if (viewedSavedGraphSection) viewedSavedGraphSection.classList.add('hidden');
            }
        );
    });
}


// Listener to save a graph (universal)
if (saveGraphBtn) {
    saveGraphBtn.addEventListener('click', async () => {
        if (!myChartCanvas || !myChartCanvas.chartInstance) {
            showMessageBox("No chart is currently plotted to save.");
            return;
        }

        const chartConfig = myChartCanvas.chartInstance.config;
        let description = prompt("Enter a brief description for this chart:");
        if (description === null) { // User clicked Cancel
            return;
        }
        if (description.trim() === "") {
            description = "Untitled Chart";
        }

        const chartId = await saveSavedChart({
            chartConfig: chartConfig,
            description: description,
            dateSaved: new Date().toISOString()
        });

        showMessageBox(`Chart "${description}" saved successfully!`);
        console.log("Chart saved with ID:", chartId);

        renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById); // Refresh the table
    });
}

// Listener to export a graph (universal)
if (exportGraphBtn) {
    exportGraphBtn.addEventListener('click', () => {
        if (!myChartCanvas || !myChartCanvas.chartInstance) {
            showMessageBox("No chart is currently plotted to export.");
            return;
        }

        // Create a temporary link element
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.href = myChartCanvas.chartInstance.toBase64Image('image/png', 1); // Get chart as PNG data URL
        a.download = 'chart.png'; // Suggested filename
        a.click(); // Programmatically click the link to trigger download
        document.body.removeChild(a); // Clean up the temporary link
        showMessageBox('Chart exported as PNG!', false);
    });
}

// Ensure UI initializes on page load
window.addEventListener('DOMContentLoaded', initializeUIForCurrentPage);
