// employees.js
// This file contains logic specific to employees.html, focusing on plotting employee-related data.

import { populateAxisSelects, drawChart, renderSavedChartsTable, loadSavedChart } from './charting.js';
import { showMessageBox, showPromptBox } from './ui-components.js';
import { parsedData, headers, saveSavedChart, loadSavedCharts, deleteSavedChartById } from './data-handlers.js'; // Import global data and save/load/delete functions
import { dataReadyPromise } from './main.js'; // Import dataReadyPromise

// --- DOM Elements specific to employees.html ---
const xAxisFilterInput = document.getElementById('xAxisFilterInput'); // Example: for employee filtering

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
const viewedGraphDescription = document.getElementById('viewedSavedChartCanvas');


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
        plotGraphBtn, xAxisFilterInput, saveGraphBtn, exportGraphBtn
    ];
    controls.forEach(control => {
        if (control) {
            control.disabled = !enable;
            // For filter input, also hide it if not enabled
            if (control === xAxisFilterInput) {
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
        savedGraphsSection.classList.add('hidden'); // Initially hide, will be shown if charts are loaded
    }
    if (mostRecentGraphSection) {
        mostRecentGraphSection.classList.add('hidden');
    }
    if (viewedSavedGraphSection) {
        viewedSavedGraphSection.classList.add('hidden');
    }
}


/**
 * Initializes the UI and event listeners for the employees page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeEmployeesPage() {
    console.log("[Employees.js] Initializing employees page UI and listeners.");

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

        // Any employees-specific default selections or logic could go here.
        // Example: pre-select 'EmployeeName' for X-axis and 'Salary' for Y-axis if those columns exist.
        if (xAxisSelect && headers.includes('EmployeeName')) xAxisSelect.value = 'EmployeeName';
        if (yAxisSelect && headers.includes('Salary') && parsedData.some(row => typeof row.Salary === 'number')) yAxisSelect.value = 'Salary';

        // Example: Populate the xAxisFilterInput with unique employee names if it exists
        if (xAxisFilterInput && xAxisSelect.value) {
            const uniqueValues = [...new Set(parsedData.map(row => String(row[xAxisSelect.value]).trim()))]
                                .filter(val => val !== '').sort();
            xAxisFilterInput.value = uniqueValues.join(', ');
            xAxisFilterInput.classList.remove('hidden'); // Ensure it's visible if data is loaded
        } else if (xAxisFilterInput) {
            xAxisFilterInput.classList.add('hidden'); // Hide if no data or no relevant column
        }

        // --- Employees-specific Event Listeners for Plotting ---
        if (plotGraphBtn) {
            plotGraphBtn.removeEventListener('click', handlePlotGraph); // Prevent duplicate listeners
            plotGraphBtn.addEventListener('click', handlePlotGraph);
        }

        // --- Other Employees-specific Event Listeners (if any) ---
        if (xAxisFilterInput) {
            xAxisFilterInput.removeEventListener('change', handlePlotGraph); // Auto-replot on filter change
            xAxisFilterInput.addEventListener('change', handlePlotGraph);
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
        if (myChartCanvas && myChartCanvas.chartInstance) {
            myChartCanvas.chartInstance.destroy();
            myChartCanvas.chartInstance = null;
        }
        if (recentSavedChartCanvas && recentSavedChartCanvas.chartInstance) {
            recentSavedChartCanvas.chartInstance.destroy();
            recentSavedChartCanvas.chartInstance = null;
        }
        if (viewedSavedChartCanvas && viewedSavedChartCanvas.chartInstance) {
            viewedSavedChartCanvas.chartInstance.destroy();
            viewedSavedChartCanvas.chartInstance = null;
        }
    }
}

/**
 * Handles the plotting of the graph for the employees page.
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

    // Apply filtering based on xAxisFilterInput
    let filteredData = [...parsedData];
    if (xAxisFilterInput && xAxisFilterInput.value && xAxisSelect.value) {
        const selectedXValues = xAxisFilterInput.value.split(',').map(s => s.trim()).filter(s => s !== '');
        if (selectedXValues.length > 0) {
            filteredData = filteredData.filter(row => selectedXValues.includes(String(row[xAxisSelect.value])));
        }
    }

    if (filteredData.length === 0) {
        showMessageBox("No data matches the selected filters. Please adjust your selections.");
        // Clear the canvas if no data matches
        if (myChartCanvas.chartInstance) {
            myChartCanvas.chartInstance.destroy();
            myChartCanvas.chartInstance = null;
        }
        return;
    }

    const currentChartConfig = { xAxisCol, yAxisCol, chartType, yAxisAggregation, page: 'employees' }; // Added page tag
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
        description = "Untitled Employee Chart";
    }

    try {
        const chartId = await saveSavedChart({
            chartConfig: { ...myChartCanvas.chartConfig, page: 'employees' }, // Ensure page tag is saved
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
    a.download = 'employee_chart.png';
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
            // Filter for charts specifically tagged for 'employees' page
            const pageSpecificCharts = savedCharts.filter(chart => chart.chartConfig && chart.chartConfig.page === 'employees');
            for (const chart of pageSpecificCharts) {
                await deleteSavedChartById(chart.id);
            }
            // Re-render the saved charts table (which will now be empty)
            await renderSavedChartsTable(savedGraphsTableBody, loadSavedChart, deleteSavedChartById);
            const remainingCharts = await loadSavedCharts(); // Check if any charts remain (from other pages)
            if (remainingCharts.length === 0) {
                savedGraphsSection.classList.add('hidden'); // Hide if no charts left at all
            }
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
window.addEventListener('DOMContentLoaded', initializeEmployeesPage);
