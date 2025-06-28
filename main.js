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
    clearChartInstances,
    myChartCanvas // Ensure this is exported from charting.js
} from './charting.js';

import { showMessageBox, hideMessageBox, showPromptBox } from './ui-components.js';

// --- DOM Elements (Universal / Main App) ---
const plotGraphBtn = document.getElementById('plotGraphBtn');
const getInsightsBtn = document.getElementById('getInsightsBtn');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');
const clearAllSavedGraphsBtn = document.getElementById('clearAllSavedGraphsBtn');
const saveGraphBtn = document.getElementById('saveGraphBtn');
const exportGraphBtn = document.getElementById('exportGraphBtn');

// References to sections on the Home page (for toggling visibility via main.js or home.js)
const chartingSection = document.getElementById('chartingSection');
const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentGraphDescription = document.getElementById('recentGraphDescription');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas'); // Canvas for recent graph
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody'); // For saved charts table

// --- Global Data Ready Promise ---
// This promise will resolve once the IndexedDB database is open and data is loaded.
export let dataReadyPromise;
let resolveDataReady;
dataReadyPromise = new Promise(resolve => {
    resolveDataReady = resolve;
});


// --- Function to initialize UI for the current page ---
async function initializeUIForCurrentPage() {
    try {
        // 1. Open IndexedDB
        await openDatabase();

        // 2. Load data from IndexedDB on startup (if any)
        await loadDataFromIndexedDB(); // <--- This populates global parsedData and headers

        // Resolve the dataReadyPromise once data is loaded (or confirmed empty)
        resolveDataReady();

        // Set the main chart canvas reference in myChartCanvas object
        myChartCanvas.canvasElement = document.getElementById('myChartCanvas');

        // If data is present, enable relevant UI elements
        if (parsedData.length > 0) {
            populateAxisSelects(parsedData, headers);
        }

        // 3. Load active plot configuration for 'home-page-plot' (if any)
        const activePlotConfig = await loadActivePlotConfig('home-page-plot');
        if (activePlotConfig && parsedData.length > 0) {
            // Automatically draw the last active plot if data is available
            drawChart(activePlotConfig.chartConfig, parsedData, activePlotConfig.chartConfig.chartType, myChartCanvas.canvasElement);
            // Show plotting and save buttons if a chart was active
            if (chartingSection) chartingSection.classList.remove('hidden');
            if (saveGraphBtn) saveGraphBtn.classList.remove('hidden');
            if (exportGraphBtn) exportGraphBtn.classList.remove('hidden');
        }

        // 4. Load and render saved charts
        // This is crucial to display saved charts on initial load
        await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);

        const savedCharts = await loadSavedCharts();
        if (savedCharts.length > 0) {
            // Show the saved graphs section
            if (document.getElementById('savedGraphsSection')) {
                document.getElementById('savedGraphsSection').classList.remove('hidden');
            }
            // Load and display the most recent saved chart if it exists
            const mostRecentChart = savedCharts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved))[0];
            if (mostRecentChart && mostRecentGraphSection && recentSavedChartCanvas) {
                mostRecentGraphSection.classList.remove('hidden');
                recentGraphDescription.textContent = `Description: ${mostRecentChart.description || 'N/A'} (Saved: ${new Date(mostRecentChart.dateSaved).toLocaleString()})`;
                // Pass the chartConfig directly from the loaded chart, and target recentSavedChartCanvas
                drawChart(mostRecentChart.chartConfig.chartConfig, parsedData, mostRecentChart.chartConfig.chartType, recentSavedChartCanvas);
            }
        } else {
            // Hide saved graphs section if no charts are saved
            if (document.getElementById('savedGraphsSection')) {
                document.getElementById('savedGraphsSection').classList.add('hidden');
            }
        }
    } catch (error) {
        console.error("Error during UI initialization or data loading:", error);
        showMessageBox(`Failed to initialize application: ${error.message}. Please refresh.`);
        resolveDataReady(); // Still resolve the promise even if there's an error, to unblock other modules
    }
}

// --- Event Listeners (Universal / Main App) ---

// Listener to plot a graph
if (plotGraphBtn) {
    plotGraphBtn.addEventListener('click', () => {
        if (parsedData.length === 0) {
            showMessageBox("Please upload a CSV file first.");
            return;
        }

        const xAxisSelect = document.getElementById('xAxisSelect');
        const yAxisSelect = document.getElementById('yAxisSelect');
        const chartTypeSelect = document.getElementById('chartTypeSelect');
        const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');

        const xAxisCol = xAxisSelect.value;
        const yAxisCol = yAxisSelect.value;
        const chartType = chartTypeSelect.value;
        const yAxisAggregation = yAxisAggregationSelect.value;

        if (!xAxisCol || !yAxisCol) {
            showMessageBox("Please select both X and Y axis columns.");
            return;
        }

        // Create a chart config object to pass to drawChart
        const currentChartConfig = { xAxisCol, yAxisCol, chartType, yAxisAggregation };

        // Draw the chart and save its configuration as the active plot
        drawChart(currentChartConfig, parsedData, chartType, myChartCanvas.canvasElement);
        // Ensure myChartCanvas.chartConfig is updated by drawChart before saving
        saveActivePlotConfig('home-page-plot', { chartConfig: myChartCanvas.chartConfig }); // Save the entire myChartCanvas.chartConfig object

        // Show save and export buttons after a chart is plotted
        if (saveGraphBtn) saveGraphBtn.classList.remove('hidden');
        if (exportGraphBtn) exportGraphBtn.classList.remove('hidden');
    });
}

// Listener for the "Get Data Insights" button
if (getInsightsBtn) {
    getInsightsBtn.addEventListener('click', async () => {
        if (parsedData.length === 0) {
            showMessageBox("Please upload a CSV file first to get insights.");
            return;
        }

        const insightsOutput = document.getElementById('insightsOutput');
        const insightsText = document.getElementById('insightsText');
        const insightsLoading = document.getElementById('insightsLoading');

        if (insightsOutput) insightsOutput.classList.remove('hidden');
        if (insightsText) insightsText.textContent = '';
        if (insightsLoading) insightsLoading.classList.remove('hidden');

        try {
            // Prepare a sample of the data for the LLM
            const sampleSize = Math.min(parsedData.length, 50); // Use up to 50 rows for insights
            const dataSample = parsedData.slice(0, sampleSize);
            const headersString = headers.join(', ');

            const prompt = `Given the following CSV data (headers: ${headersString}) and a sample of the first ${sampleSize} rows: ${JSON.stringify(dataSample)}. Provide a concise summary of the data, highlighting key trends, potential outliers, and interesting relationships between columns. Also, suggest 2-3 potential plots or analyses that could be done with this data, and briefly explain why.`;

            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json(); // Await the JSON parsing

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                if (insightsText) insightsText.textContent = text;
            } else {
                if (insightsText) insightsText.textContent = 'Could not retrieve insights. Please try again.';
                console.error("Unexpected API response structure:", result);
            }
        } catch (error) {
            console.error("Error fetching insights:", error);
            if (insightsText) insightsText.textContent = `Error: ${error.message}`;
            showMessageBox("Failed to get insights. Please check your network connection or try again.");
        } finally {
            if (insightsLoading) insightsLoading.classList.add('hidden');
        }
    });
}


// Listener to clear all data and saved plots
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', async () => {
        // Now using showPromptBox from ui-components.js
        const confirmClear = await showPromptBox("Are you sure you want to clear ALL data and saved plots? This action cannot be undone.");
        if (confirmClear) {
            try {
                await clearCSVDataFromIndexedDB(); // Clears CSV data and headers
                await clearAllSavedCharts();       // Clears all saved charts
                await clearActivePlotConfig('home-page-plot');     // Clears active plot config for this page

                parsedData.splice(0, parsedData.length); // Clear global parsedData array
                headers.splice(0, headers.length);       // Clear global headers array

                clearChartInstances(); // Destroy all Chart.js instances

                // Reset UI elements on the home page
                if (document.getElementById('fileName')) {
                    document.getElementById('fileName').textContent = 'No file selected. Please upload a CSV to begin your analysis.';
                }
                // Re-initialize home page to reset its state
                if (typeof initializeHomePage !== 'undefined') {
                    // Call the function from home.js if it's available in scope
                    initializeHomePage();
                } else {
                    // Fallback or a more direct reset if initializeHomePage isn't global
                    location.reload(); // Simple reload to reset everything
                }

                showMessageBox("All data and saved plots have been cleared!");
                // Also re-render the saved charts table to reflect the cleared state
                await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            } catch (error) {
                console.error("Error clearing all data:", error);
                showMessageBox(`Error clearing data: ${error.message}`);
            }
        } else {
            showMessageBox("Clear operation cancelled.");
        }
    });
}

// Listener to clear only saved graphs (separate from all data)
if (clearAllSavedGraphsBtn) {
    clearAllSavedGraphsBtn.addEventListener('click', async () => {
        const confirmClear = await showPromptBox("Are you sure you want to clear ALL saved graphs? This action cannot be undone.");
        if (confirmClear) {
            try {
                await clearAllSavedCharts(); // Clears only saved charts
                // Re-render the saved charts table (which will now be empty)
                await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById); // <-- Ensure this is awaited
                showMessageBox("All saved graphs have been cleared!");
            } catch (error) {
                console.error("Error clearing saved graphs:", error);
                showMessageBox(`Error clearing saved graphs: ${error.message}`);
            }
        } else {
            showMessageBox("Clear saved graphs operation cancelled.");
        }
    });
}


// Listener to save a graph
if (saveGraphBtn) {
    saveGraphBtn.addEventListener('click', async () => {
        // myChartCanvas now contains chartInstance and chartConfig from the drawChart function
        if (!myChartCanvas.chartInstance || !myChartCanvas.chartConfig) {
            showMessageBox("No chart is currently plotted to save.");
            return;
        }

        let description = await showPromptBox("Enter a description for your chart (optional):");
        if (description === null) { // User clicked Cancel
            return;
        }
        if (description.trim() === "") {
            description = "Untitled Chart";
        }

        const chartId = await saveSavedChart({
            chartConfig: myChartCanvas.chartConfig, // Use the stored myChartCanvas.chartConfig object
            description: description,
            dateSaved: new Date().toISOString()
        });

        showMessageBox(`Chart "${description}" saved successfully!`);
        console.log("Chart saved with ID:", chartId);

        // Crucial: Re-render the saved charts table after a new chart is saved
        await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById); // <-- This line was missing await for robust refresh
    });
}

// Listener to export a graph (universal)
if (exportGraphBtn) {
    exportGraphBtn.addEventListener('click', () => {
        if (!myChartCanvas.chartInstance) {
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
