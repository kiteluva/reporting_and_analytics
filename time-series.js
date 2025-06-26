// time-series.js
// This file contains logic specific to time-series.html, focusing on plotting time-series data.

import { populateAxisSelects, drawChart, renderSavedChartsTable, loadSavedChart } from './charting.js';
import { showMessageBox, showPromptBox } from './ui-components.js';
import { parsedData, headers, saveSavedChart, loadSavedCharts, deleteSavedChartById } from './data-handlers.js'; // Import global data and save/load/delete functions
import { dataReadyPromise } from './main.js'; // Import dataReadyPromise

// --- DOM Elements specific to time-series.html ---
const startDateInput = document.getElementById('startDateInput');
const endDateInput = document.getElementById('endDateInput');

// Elements related to displaying data status and plotting controls
const fileNameDisplay = document.getElementById('fileNameDisplay'); // Assuming this ID for data status on this page
const plottingControlsSection = document.getElementById('plottingControlsSection'); // Assuming a wrapper for plotting controls
const plotGraphBtn = document.getElementById('plotGraphBtn'); // The main plot button for this page

// Selects for plotting
const xAxisSelect = document.getElementById('xAxisSelect');
const yAxisSelect = document.getElementById('yAxisSelect');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');
const myChartCanvas = document.getElementById('myChartCanvas'); // Assuming a canvas for plotting on this page

// Saved plots related elements
const saveGraphBtn = document.getElementById('saveGraphBtn');
const exportGraphBtn = document.getElementById('exportGraphBtn');
const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentGraphDescription = document.getElementById('recentGraphDescription');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas');
const savedGraphsSection = document.getElementById('savedGraphsSection');
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody');
const clearAllSavedGraphsBtn = document.getElementById('clearAllSavedGraphsBtn');
const viewedSavedGraphSection = document.getElementById('viewedSavedGraphSection');
const viewedGraphDescription = document.getElementById('viewedGraphDescription');
const viewedSavedChartCanvas = document.getElementById('viewedSavedChartCanvas');


/**
 * Helper function to set the visibility and enabled state of plotting controls.
 * @param {boolean} enable - True to enable and show, false to disable and hide.
 */
function setPlottingControlsState(enable) {
    if (plottingControlsSection) {
        if (enable) {
            plottingControlsSection.classList.remove('hidden');
        } else {
            plottingControlsSection.classList.add('hidden');
        }
    }
    // Individual elements might need to be enabled/disabled too, depending on HTML structure
    const controls = [
        xAxisSelect, yAxisSelect, chartTypeSelect, yAxisAggregationSelect,
        plotGraphBtn, startDateInput, endDateInput, saveGraphBtn, exportGraphBtn
    ];
    controls.forEach(control => {
        if (control) {
            control.disabled = !enable;
            // For date inputs, also hide them if not enabled, as they have their own class management
            if (control === startDateInput || control === endDateInput) {
                 if (!enable) control.classList.add('hidden');
            }
        }
    });

    // Handle canvas visibility separately
    if (myChartCanvas) {
        if (enable && parsedData.length > 0) {
            myChartCanvas.classList.remove('hidden');
        } else {
            myChartCanvas.classList.add('hidden');
        }
    }

    // Manage visibility of saved charts sections based on data presence and whether any charts are saved
    if (savedGraphsSection) {
        if (enable && (savedGraphsTableBody && savedGraphsTableBody.rows.length > 0)) { // Check if there are actual rows
            savedGraphsSection.classList.remove('hidden');
        } else {
            savedGraphsSection.classList.add('hidden');
        }
    }
    if (mostRecentGraphSection) {
        // This section will be managed by loadSavedChart logic if a chart is loaded
        // For now, keep it hidden unless explicitly shown by chart loading
        mostRecentGraphSection.classList.add('hidden');
    }
    if (viewedSavedGraphSection) {
        viewedSavedGraphSection.classList.add('hidden');
    }
}


/**
 * Initializes the UI and event listeners for the time series page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeTimeSeriesPage() {
    console.log("[Time-Series.js] Initializing time series page UI and listeners.");

    // Await the dataReadyPromise to ensure parsedData and headers are loaded from IndexedDB
    await dataReadyPromise;

    if (parsedData.length > 0 && headers.length > 0) {
        // Data is loaded and available!
        if (fileNameDisplay) {
            const loadedFileName = localStorage.getItem('csvPlotterFileName') || 'Unnamed File';
            fileNameDisplay.textContent = `Data loaded: ${loadedFileName} (${parsedData.length} rows)`;
            fileNameDisplay.classList.remove('text-red-500'); // Remove error styling if present
            fileNameDisplay.classList.add('text-green-700'); // Add success styling
        }

        setPlottingControlsState(true); // Enable and show plotting controls

        // Populate common axis selects from charting.js
        populateAxisSelects(parsedData, headers);

        // Any time-series-specific default selections or logic could go here.
        // Example: pre-select a 'Date' column for X-axis and a numeric 'Value' for Y-axis.
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
                startDateInput.classList.remove('hidden'); // Ensure inputs are visible
                endDateInput.classList.remove('hidden');
            } else {
                startDateInput.classList.add('hidden'); // Hide if no valid date data
                endDateInput.classList.add('hidden');
            }
        } else {
             if (startDateInput) startDateInput.classList.add('hidden'); // Hide if elements not found or no X-axis selected
             if (endDateInput) endDateInput.classList.add('hidden');
        }

        // --- Time Series-specific Event Listeners for Plotting ---
        if (plotGraphBtn) {
            plotGraphBtn.removeEventListener('click', handlePlotGraph); // Prevent duplicate listeners
            plotGraphBtn.addEventListener('click', handlePlotGraph);
        }

        // --- Other Time Series-specific Event Listeners (if any) ---
        if (startDateInput) {
            startDateInput.removeEventListener('change', handlePlotGraph);
            startDateInput.addEventListener('change', handlePlotGraph);
        }
        if (endDateInput) {
            endDateInput.removeEventListener('change', handlePlotGraph);
            endDateInput.addEventListener('change', handlePlotGraph);
        }

        // Saved Graphs Listeners and rendering
        if (saveGraphBtn) {
            saveGraphBtn.removeEventListener('click', handleSaveGraph);
            saveGraphBtn.addEventListener('click', handleSaveGraph);
        }
        if (exportGraphBtn) {
            exportGraphBtn.removeEventListener('click', handleExportGraph);
            exportGraphBtn.addEventListener('click', handleExportGraph);
        }
        if (clearAllSavedGraphsBtn) {
            clearAllSavedGraphsBtn.removeEventListener('click', handleClearAllSavedGraphs);
            clearAllSavedGraphsBtn.addEventListener('click', handleClearAllSavedGraphs);
        }

        // Initial render of saved charts table on page load
        if (savedGraphsTableBody) {
             await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
             // After rendering, check if there are any saved charts to show the section
             const savedCharts = await loadSavedCharts();
             if (savedCharts.length > 0) {
                 savedGraphsSection.classList.remove('hidden');
                 // Load and display the most recent saved chart if it exists
                 const mostRecentChart = savedCharts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved))[0];
                 if (mostRecentChart && mostRecentGraphSection && recentSavedChartCanvas) {
                     mostRecentGraphSection.classList.remove('hidden');
                     recentGraphDescription.textContent = `Description: ${mostRecentChart.description || 'N/A'} (Saved: ${new Date(mostRecentChart.dateSaved).toLocaleString()})`;
                     // Pass the chartConfig directly from the loaded chart, and target recentSavedChartCanvas
                     drawChart(mostRecentChart.chartConfig.chartConfig, parsedData, mostRecentChart.chartConfig.chartType, recentSavedChartCanvas);
                 }
             } else {
                 savedGraphsSection.classList.add('hidden');
             }
        }


    } else {
        // No data loaded. Display appropriate message and disable controls.
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'No file selected. Please upload a CSV on the Home page.';
            fileNameDisplay.classList.remove('text-green-700');
            fileNameDisplay.classList.add('text-red-500');
        }
        showMessageBox("No data loaded. Please upload a CSV file on the Home page first to perform analysis.");
        setPlottingControlsState(false); // Disable and hide plotting controls
        // Also clear any existing chart instances specific to this page
        if (myChartCanvas && myChartCanvas.chartInstance) { // Access myChartCanvas.chartInstance if it's set up
            myChartCanvas.chartInstance.destroy();
        }
        if (recentSavedChartCanvas && recentSavedChartCanvas.chartInstance) {
            recentSavedChartCanvas.chartInstance.destroy();
        }
        if (viewedSavedChartCanvas && viewedSavedChartCanvas.chartInstance) {
            viewedSavedChartCanvas.chartInstance.destroy();
        }
    }
}

/**
 * Handles the plotting of the graph for the time series page, including date filtering.
 */
function handlePlotGraph() {
    if (parsedData.length === 0) {
        showMessageBox("No data available to plot. Please upload a CSV file on the Home tab.");
        return;
    }

    const xAxisCol = xAxisSelect.value;
    const yAxisCol = yAxisSelect.value;
    const chartType = chartTypeSelect.value;
    const yAxisAggregation = yAxisAggregationSelect.value;

    if (!xAxisCol || !yAxisCol) {
        showMessageBox("Please select both X and Y axis columns for plotting.");
        return;
    }

    // Apply date filtering specific to time series
    let filteredData = [...parsedData];
    if (startDateInput.value && endDateInput.value && xAxisSelect.value) {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            showMessageBox("Invalid start or end date for time series filtering.");
            return;
        }
        // Set end date to end of the day for inclusive filtering
        endDate.setHours(23, 59, 59, 999);

        if (startDate.getTime() > endDate.getTime()) {
            showMessageBox("Start date cannot be after end date.");
            return;
        }

        filteredData = filteredData.filter(row => {
            const rowDate = new Date(row[xAxisCol]);
            return !isNaN(rowDate.getTime()) && rowDate >= startDate && rowDate <= endDate;
        });
    }

    if (filteredData.length === 0) {
        showMessageBox("No data matches the selected date range. Please adjust your date filters.");
        // Clear the canvas if no data matches
        if (myChartCanvas.chartInstance) {
            myChartCanvas.chartInstance.destroy();
            myChartCanvas.chartInstance = null;
        }
        return;
    }

    const currentChartConfig = { xAxisCol, yAxisCol, chartType, yAxisAggregation };
    drawChart(currentChartConfig, filteredData, chartType, myChartCanvas);
}

/**
 * Handles saving the currently plotted graph.
 */
async function handleSaveGraph() {
    if (!myChartCanvas || !myChartCanvas.chartInstance || !myChartCanvas.chartConfig) {
        showMessageBox("No chart is currently plotted to save.");
        return;
    }

    let description = await showPromptBox("Enter a description for your chart (optional):");
    if (description === null) { // User clicked Cancel
        return;
    }
    if (description.trim() === "") {
        description = "Untitled Time Series Chart";
    }

    try {
        const chartId = await saveSavedChart({
            chartConfig: myChartCanvas.chartConfig,
            description: description,
            dateSaved: new Date().toISOString()
        });

        showMessageBox(`Chart "${description}" saved successfully!`);
        console.log("Chart saved with ID:", chartId);

        // Re-render the saved charts table and update visibility
        if (savedGraphsTableBody) {
            await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            savedGraphsSection.classList.remove('hidden'); // Ensure section is visible
        }
    } catch (error) {
        console.error("Error saving chart:", error);
        showMessageBox(`Error saving chart: ${error.message}`);
    }
}

/**
 * Handles exporting the currently plotted graph as an image.
 */
function handleExportGraph() {
    if (!myChartCanvas || !myChartCanvas.chartInstance) {
        showMessageBox("No chart is currently plotted to export.");
        return;
    }

    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = myChartCanvas.chartInstance.toBase64Image('image/png', 1);
    a.download = 'time_series_chart.png';
    a.click();
    document.body.removeChild(a);
    showMessageBox('Chart exported as PNG!', false);
}

/**
 * Handles clearing all saved graphs for this page.
 */
async function handleClearAllSavedGraphs() {
    const confirmClear = await showPromptBox("Are you sure you want to clear ALL saved graphs on this page? This action cannot be undone.");
    if (confirmClear) {
        try {
            const savedCharts = await loadSavedCharts();
            const pageSpecificCharts = savedCharts.filter(chart => chart.chartConfig && chart.chartConfig.page === 'time-series'); // Assuming you can tag charts by page
            for (const chart of pageSpecificCharts) {
                await deleteSavedChartById(chart.id);
            }
            // If no page specific tag, you might need to clear all or add a page identifier to saved chart config.
            // For now, let's assume we clear all or you refine the deletion later.
            // Simplified: await clearAllSavedCharts(); // This would clear ALL charts, not just page specific

            // Re-render the saved charts table (which will now be empty)
            await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            savedGraphsSection.classList.add('hidden'); // Hide if no charts left
            showMessageBox("All saved graphs on this page have been cleared!");
        } catch (error) {
            console.error("Error clearing saved graphs:", error);
            showMessageBox(`Error clearing saved graphs: ${error.message}`);
        }
    } else {
        showMessageBox("Clear saved graphs operation cancelled.");
    }
}


// Attach the initialization function to the DOMContentLoaded event
window.addEventListener('DOMContentLoaded', initializeTimeSeriesPage);
