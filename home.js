// home.js
// This file contains logic specific to home.html, including CSV upload, data display, and distribution plotting.

import { showMessageBox } from './ui-components.js';
import {
    parseCSV,
    saveDataToIndexedDB,
    parsedData, // Global parsed data from data-handlers.js
    headers, // Global headers from data-handlers.js
    loadDataFromIndexedDB // Import to check if data is already present on load
} from './data-handlers.js';
import {
    populateAxisSelects,
    drawChart,
    clearChartInstances,
    renderSavedChartsTable,
    loadSavedChart,
    myChartCanvas // Global reference to the main plotting canvas instance
} from './charting.js';

// Import dataReadyPromise from main.js
import { dataReadyPromise } from './main.js';

// --- DOM Elements specific to home.html ---
const csvFileInput = document.getElementById('csvFile');
const fileNameDisplay = document.getElementById('fileName'); // Displays file status

const showDataOverviewBtn = document.getElementById('showDataOverviewBtn');
const showPlottingSectionBtn = document.getElementById('showPlottingSectionBtn');

// Section references for visibility toggling
const dataHeadSection = document.getElementById('dataHeadSection');
const dataHeadTable = document.getElementById('dataHeadTable'); // Table inside dataHeadSection

const descriptiveStatisticsSection = document.getElementById('descriptiveStatisticsSection');
const statisticsTable = document.getElementById('statisticsTable'); // Table inside descriptiveStatisticsSection

const columnDistributionSection = document.getElementById('columnDistributionSection');
const distributionColumnSelect = document.getElementById('distributionColumnSelect');
const distributionChartCanvas = document.getElementById('distributionChartCanvas');

const chartingSection = document.getElementById('chartingSection'); // Custom plotting area
const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas'); // Canvas for recent graph
const recentGraphDescription = document.getElementById('recentGraphDescription'); // Description for recent graph

const savedGraphsSection = document.getElementById('savedGraphsSection');
const savedGraphsTableBody = document.getElementById('savedGraphsTableBody'); // Table body for saved graphs


// --- Utility Functions (moved from main.js or other places if needed here) ---

// Function to handle CSV file input change
async function handleCSVFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        showMessageBox("No file selected.");
        fileNameDisplay.textContent = 'No file selected. Please upload a CSV to begin your analysis.';
        // Disable buttons and hide sections if no file is selected
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
        hideAllAnalyticalSections(); // Helper function to hide all sections
        clearChartInstances(); // Clear any existing charts
        return;
    }

    if (file.type !== 'text/csv') {
        showMessageBox("Please upload a valid CSV file.");
        fileNameDisplay.textContent = 'Invalid file type. Please upload a CSV.';
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
        return;
    }

    fileNameDisplay.textContent = `Loading ${file.name}...`;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Parse CSV and save to IndexedDB
                const { data, headers: hdrs } = parseCSV(e.target.result);
                // Update the globally imported parsedData and headers
                parsedData.splice(0, parsedData.length, ...data); // Clear and repopulate
                headers.splice(0, headers.length, ...hdrs);       // Clear and repopulate

                await saveDataToIndexedDB(parsedData, headers, file.name);

                fileNameDisplay.textContent = `File loaded: ${file.name}`;
                showMessageBox(`CSV file "${file.name}" loaded and saved!`);

                // Enable buttons after successful load
                showDataOverviewBtn.disabled = false;
                showPlottingSectionBtn.disabled = false;

                // Automatically update and show data overview sections after a new file is uploaded
                updateAndShowDataOverview();

            } catch (error) {
                console.error("Error processing CSV:", error);
                showMessageBox(`Error processing CSV: ${error.message}`);
                fileNameDisplay.textContent = 'Error loading file.';
                showDataOverviewBtn.disabled = true;
                showPlottingSectionBtn.disabled = true;
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error("File read error:", error);
        showMessageBox(`Failed to read file: ${error.message}`);
        fileNameDisplay.textContent = 'Error reading file.';
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
    }
}

// Helper function to hide all analytical sections
function hideAllAnalyticalSections() {
    if (dataHeadSection) dataHeadSection.classList.add('hidden');
    if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.add('hidden');
    if (columnDistributionSection) columnDistributionSection.classList.add('hidden');
    if (chartingSection) chartingSection.classList.add('hidden');
    if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
    if (savedGraphsSection) savedGraphsSection.classList.add('hidden');
}

/**
 * Updates and shows the data overview sections (Data Head, Descriptive Statistics, Column Distribution).
 * This function can be called after data is loaded/updated to refresh the display.
 */
function updateAndShowDataOverview() {
    if (parsedData.length > 0) {
        // Show data overview sections
        if (dataHeadSection) dataHeadSection.classList.remove('hidden');
        if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.remove('hidden');
        if (columnDistributionSection) columnDistributionSection.classList.remove('hidden');

        // Populate and draw relevant data
        populateDataHeadTable(dataHeadTable, parsedData, headers);
        populateStatisticsTable(statisticsTable, parsedData, headers);
        populateDistributionColumnSelect(distributionColumnSelect, headers, parsedData);

        // Draw initial distribution chart if a column is selected
        if (distributionColumnSelect.value) {
            drawColumnDistributionChart(parsedData, distributionColumnSelect.value);
        } else if (headers.length > 0) { // Select the first numerical column if available
            const firstNumericalHeader = headers.find(h => parsedData.some(row => typeof row[h] === 'number' && !isNaN(row[h])));
            if (firstNumericalHeader) {
                distributionColumnSelect.value = firstNumericalHeader;
                drawColumnDistributionChart(parsedData, firstNumericalHeader);
            }
        }
    } else {
        // If no data, hide these sections
        hideAllAnalyticalSections();
    }
}


// Function to populate the Data Head table
function populateDataHeadTable(tableElement, data, headers) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Clear existing content

    // Create table header
    const thead = tableElement.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Create table body
    const tbody = tableElement.createTBody();
    // Show only the first 8 rows
    const rowsToShow = Math.min(data.length, 8);
    for (let i = 0; i < rowsToShow; i++) {
        const rowData = data[i];
        const tr = tbody.insertRow();
        tr.className = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'; // Zebra stripping

        headers.forEach(header => {
            const td = tr.insertCell();
            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
            // Display values directly, convert to string if not already
            td.textContent = String(rowData[header]);
        });
    }
}

// Function to calculate and populate descriptive statistics
function populateStatisticsTable(tableElement, data, headers) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Clear existing content

    // Headers for statistics table
    const statsHeaders = ['', 'Count', 'Mean', 'Median', 'Mode', 'Std Dev', 'Min', 'Max'];
    const thead = tableElement.createTHead();
    const headerRow = thead.insertRow();
    statsHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    // Calculate and populate statistics
    const tbody = tableElement.createTBody();
    let rowIndex = 0; // To handle zebra stripping correctly for displayed rows
    headers.forEach(header => {
        // Collect all numerical values for the current header
        const columnValues = data
            .map(row => row[header])
            .filter(value => typeof value === 'number' && !isNaN(value)); // Ensure values are numbers and not NaN

        // Only calculate and display for numerical columns with at least one value
        if (columnValues.length > 0) {
            const tr = tbody.insertRow();
            tr.className = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            rowIndex++; // Increment row index for stripping

            // Column Name Cell
            tr.insertCell().outerHTML = `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${header}</td>`;

            const count = columnValues.length;
            const mean = count > 0 ? columnValues.reduce((sum, val) => sum + val, 0) / count : 0;

            const sortedValues = [...columnValues].sort((a, b) => a - b);
            let median = 0;
            if (count > 0) {
                const mid = Math.floor(count / 2);
                median = count % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
            }

            // Mode calculation (can have multiple modes, display first or all joined)
            const frequencyMap = {};
            columnValues.forEach(val => {
                frequencyMap[val] = (frequencyMap[val] || 0) + 1;
            });
            let maxFreq = 0;
            let modes = [];
            for (const key in frequencyMap) {
                if (frequencyMap[key] > maxFreq) {
                    maxFreq = frequencyMap[key];
                    modes = [key];
                } else if (frequencyMap[key] === maxFreq) {
                    modes.push(key);
                }
            }
            const mode = modes.length > 0 ? modes.join(', ') : 'N/A'; // Handle no mode if all unique


            // Standard Deviation (sample standard deviation)
            const stdDev = count > 1 ? Math.sqrt(columnValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (count - 1)) : 0;
            const min = count > 0 ? Math.min(...columnValues) : 'N/A';
            const max = count > 0 ? Math.max(...columnValues) : 'N/A';

            // Populate cells with calculated statistics
            tr.insertCell().textContent = count.toFixed(0);
            tr.insertCell().textContent = mean.toFixed(2);
            tr.insertCell().textContent = median.toFixed(2);
            tr.insertCell().textContent = mode; // Mode might be string or number
            tr.insertCell().textContent = stdDev.toFixed(2);
            tr.insertCell().textContent = typeof min === 'number' ? min.toFixed(2) : min;
            tr.insertCell().textContent = typeof max === 'number' ? max.toFixed(2) : max;
        }
    });
    // If no numerical columns were processed, display a message
    if (tbody.rows.length === 0) {
        const tr = tbody.insertRow();
        tr.innerHTML = '<td colspan="8" class="px-6 py-4 text-center text-gray-500 italic">No numerical columns found for descriptive statistics.</td>';
    }
}

// Function to populate the column distribution select dropdown
function populateDistributionColumnSelect(selectElement, headers, data) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Select a column</option>'; // Default option
    const numericHeaders = headers.filter(header =>
        data.some(row => typeof row[header] === 'number' && !isNaN(row[header]))
    );

    if (numericHeaders.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No numerical columns available";
        option.disabled = true;
        selectElement.appendChild(option);
        return;
    }

    numericHeaders.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        selectElement.appendChild(option);
    });

    // Automatically select the first numerical column if available and no selection made
    if (selectElement.value === "" && numericHeaders.length > 0) {
        selectElement.value = numericHeaders[0];
    }
}

// Chart.js instance for distribution chart
let distributionChartInstance = null;

// Function to draw column distribution chart (Histogram/Density)
function drawColumnDistributionChart(data, columnName) {
    if (!columnName || !data || data.length === 0 || !distributionChartCanvas) {
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
            distributionChartInstance = null;
        }
        return;
    }

    const numericalValues = data.map(row => row[columnName]).filter(value => typeof value === 'number' && !isNaN(value));

    if (numericalValues.length === 0) {
        showMessageBox(`Column "${columnName}" contains no numerical data for distribution chart.`);
        if (distributionChartInstance) {
            distributionChartInstance.destroy();
            distributionChartInstance = null;
        }
        return;
    }

    // Destroy existing chart instance if it exists
    if (distributionChartInstance) {
        distributionChartInstance.destroy();
    }

    // Determine min and max for binning
    const minValue = Math.min(...numericalValues);
    const maxValue = Math.max(...numericalValues);
    const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(numericalValues.length)))); // Min 5, Max 20 bins
    const range = maxValue - minValue;
    let binSize = range === 0 ? 1 : range / binCount;

    // Adjust binSize slightly if range is very small or zero to avoid infinite loop / too many bins
    if (binSize === 0) {
        binSize = 0.1; // Small default bin size if all values are the same
    }

    // Create bins
    const bins = Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
        const lowerBound = minValue + i * binSize;
        const upperBound = minValue + (i + 1) * binSize;
        labels.push(`${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`);
    }

    numericalValues.forEach(value => {
        let binIndex = Math.floor((value - minValue) / binSize);
        if (binIndex >= binCount) { // Ensure the maximum value falls into the last bin
            binIndex = binCount - 1;
        }
        if (binIndex < 0) { // Ensure minimum value falls into the first bin
            binIndex = 0;
        }
        bins[binIndex]++;
    });

    const ctx = distributionChartCanvas.getContext('2d');
    distributionChartInstance = new Chart(ctx, {
        type: 'bar', // Histogram is typically a bar chart
        data: {
            labels: labels,
            datasets: [{
                label: `Frequency of ${columnName}`,
                data: bins,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: columnName
                    },
                    // For histograms, bars should ideally touch
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequency'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Frequency: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}


// --- Main Initialization for home.html elements ---
async function initializeHomePage() {
    // Await the dataReadyPromise to ensure parsedData and headers are loaded
    await dataReadyPromise;

    // Attach file input listener
    if (csvFileInput) {
        csvFileInput.removeEventListener('change', handleCSVFileUpload); // Prevent duplicate listeners
        csvFileInput.addEventListener('change', handleCSVFileUpload);
    }

    // Attach button listeners for showing/hiding sections
    if (showDataOverviewBtn) {
        showDataOverviewBtn.removeEventListener('click', handleShowDataOverview);
        showDataOverviewBtn.addEventListener('click', handleShowDataOverview);
    }

    if (showPlottingSectionBtn) {
        showPlottingSectionBtn.removeEventListener('click', handleShowPlottingSection);
        showPlottingSectionBtn.addEventListener('click', handleShowPlottingSection);
    }

    if (distributionColumnSelect) {
        distributionColumnSelect.removeEventListener('change', handleDistributionColumnChange);
        distributionColumnSelect.addEventListener('change', handleDistributionColumnChange);
    }

    // Initial state: hide all analytical sections
    hideAllAnalyticalSections();

    // After dataReadyPromise resolves, check if data is loaded and enable buttons
    if (parsedData.length > 0) {
        fileNameDisplay.textContent = `File loaded (from IndexedDB): ${localStorage.getItem('csvPlotterFileName') || 'Unnamed File'}`;
        fileNameDisplay.classList.remove('text-red-500');
        fileNameDisplay.classList.add('text-green-700');
        showDataOverviewBtn.disabled = false;
        showPlottingSectionBtn.disabled = false;
        updateAndShowDataOverview(); // Automatically show data overview if data is present on load
    } else {
        fileNameDisplay.textContent = 'No file selected. Please upload a CSV to begin your analysis.';
        fileNameDisplay.classList.remove('text-green-700');
        fileNameDisplay.classList.add('text-red-500');
        showDataOverviewBtn.disabled = true;
        showPlottingSectionBtn.disabled = true;
    }
}

/**
 * Event handler for showing data overview.
 */
function handleShowDataOverview() {
    hideAllAnalyticalSections(); // Hide all first
    updateAndShowDataOverview(); // Then show/update data overview
}

/**
 * Event handler for showing plotting section.
 */
async function handleShowPlottingSection() {
    if (parsedData.length > 0) {
        hideAllAnalyticalSections();
        // Show plotting sections
        if (chartingSection) chartingSection.classList.remove('hidden');
        if (mostRecentGraphSection) mostRecentGraphSection.classList.remove('hidden');
        if (savedGraphsSection) savedGraphsSection.classList.remove('hidden');

        // Re-populate axis selects and attempt to draw active plot if any
        populateAxisSelects(parsedData, headers); // This function is from charting.js

        // Load and display the most recent saved chart if it exists
        const savedCharts = await loadSavedCharts();
        if (savedCharts.length > 0) {
            const mostRecentChart = savedCharts.sort((a, b) => new Date(b.dateSaved) - new Date(a.dateSaved))[0];
            if (mostRecentChart && mostRecentGraphSection && recentSavedChartCanvas) {
                mostRecentGraphSection.classList.remove('hidden');
                recentGraphDescription.textContent = `Description: ${mostRecentChart.description || 'N/A'} (Saved: ${new Date(mostRecentChart.dateSaved).toLocaleString()})`;
                drawChart(mostRecentChart.chartConfig.chartConfig, parsedData, mostRecentChart.chartConfig.chartType, recentSavedChartCanvas);
            }
        }
        // The main.js file handles loading the active plot configuration
        // after the UI is initialized and data is ready.
    } else {
        showMessageBox('No data loaded. Please upload a CSV file first.');
    }
}

/**
 * Event handler for distribution column select change.
 */
function handleDistributionColumnChange(event) {
    drawColumnDistributionChart(parsedData, event.target.value);
}


// Attach the initialization function to the DOMContentLoaded event
// This will run after the DOM is fully loaded.
window.addEventListener('DOMContentLoaded', initializeHomePage);
