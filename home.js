// home.js
// This file contains logic specific to home.html, including CSV upload, data display, and distribution plotting.

import { showMessageBox } from './ui-components.js';
import {
    parseCSV,
    saveDataToIndexedDB,
    parsedData, // Global parsed data from data-handlers.js
    headers // Global headers from data-handlers.js
} from './data-handlers.js';
import {
    populateAxisSelects,
    drawChart,
    clearChartInstances
} from './charting.js';
// No need to import globalParsedData/globalHeaders from main.js, use directly from data-handlers.js
// No need for a separate initializeHomePage; main.js will call initializeUIForCurrentPage

// --- DOM Elements specific to home.html ---
const csvFileInput = document.getElementById('csvFile');
const fileNameDisplay = document.getElementById('fileName');
const dataHeadSection = document.getElementById('dataHeadSection');
const dataHeadTable = document.getElementById('dataHeadTable');
const descriptiveStatisticsSection = document.getElementById('descriptiveStatisticsSection');
const statisticsTable = document.getElementById('statisticsTable');
const columnDistributionSection = document.getElementById('columnDistributionSection');
const distributionColumnSelect = document.getElementById('distributionColumnSelect');
const distributionChartCanvas = document.getElementById('distributionChartCanvas');
const showDataOverviewBtn = document.getElementById('showDataOverviewBtn');
const showPlottingSectionBtn = document.getElementById('showPlottingSectionBtn');

let myDistributionChart = null; // Chart instance for column distribution

// Elements that home.js needs to interact with but are universally declared in main.js
// These will be passed as arguments or directly accessed if they are truly universal and globally scoped
const myChartCanvas = document.getElementById('myChartCanvas'); // Main canvas for plotting on plot pages
const xAxisSelect = document.getElementById('xAxisSelect');
const yAxisSelect = document.getElementById('yAxisSelect');
const chartTypeSelect = document.getElementById('chartTypeSelect');
const yAxisAggregationSelect = document.getElementById('yAxisAggregationSelect');
const saveGraphBtn = document.getElementById('saveGraphBtn');
const exportGraphBtn = document.getElementById('exportGraphBtn');
const recentGraphDescription = document.getElementById('recentGraphDescription');
const recentSavedChartCanvas = document.getElementById('recentSavedChartCanvas');


/**
 * Resets the UI elements specific to home.html.
 */
function resetHomeUI() {
    if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
    if (dataHeadSection) dataHeadSection.classList.add('hidden');
    if (dataHeadTable) dataHeadTable.innerHTML = '';
    if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.add('hidden');
    if (statisticsTable) statisticsTable.innerHTML = '';
    if (columnDistributionSection) columnDistributionSection.classList.add('hidden');
    if (distributionColumnSelect) distributionColumnSelect.innerHTML = '<option value="">Select Column</option>';
    if (myDistributionChart) {
        myDistributionChart.destroy();
        myDistributionChart = null;
    }
    // Also clear the file input value
    if (csvFileInput) csvFileInput.value = '';

    // Hide other sections if they are specific to this page's initial state and not managed by main.js
    const plottingControlsSection = document.getElementById('plottingControlsSection');
    const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
    const savedGraphsSection = document.getElementById('savedGraphsSection');
    const insightsOutput = document.getElementById('insightsOutput');

    if (plottingControlsSection) plottingControlsSection.classList.add('hidden');
    if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
    if (savedGraphsSection) savedGraphsSection.classList.add('hidden');
    if (insightsOutput) insightsOutput.classList.add('hidden');
}


/**
 * Handles CSV file loading, parsing, and initial data display.
 */
async function handleCSVFile(event) {
    const file = event.target.files[0];
    if (!file) {
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
        resetHomeUI(); // Reset home specific UI if no file is chosen
        // No need to call resetUniversalUI here, main.js's initializeUIForCurrentPage handles overall
        return;
    }

    if (file.type !== 'text/csv') {
        showMessageBox('Please upload a valid CSV file (.csv).');
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
        resetHomeUI(); // Reset home specific UI on invalid file type
        return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20 MB limit
        showMessageBox("File is too large. Please upload a CSV file smaller than 20MB.");
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file chosen';
        resetHomeUI();
        return;
    }

    if (fileNameDisplay) fileNameDisplay.textContent = file.name;

    try {
        const text = await file.text();
        const { data, headers: newHeaders } = parseCSV(text); // Use parseCSV from data-handlers.js

        if (data.length === 0) {
            showMessageBox("The CSV file is empty or contains no valid data rows after headers.");
            resetHomeUI();
            return;
        }

        // Save to IndexedDB which updates the `parsedData` and `headers` in data-handlers.js
        await saveDataToIndexedDB(data, newHeaders);
        localStorage.setItem('csvPlotterFileName', file.name); // Save filename to local storage

        console.log("CSV loaded and saved to IndexedDB. Data points:", parsedData.length, "Headers:", headers.length);
        showMessageBox(`"${file.name}" loaded and saved offline!`);

        // Display initial data overviews
        displayDataHead(parsedData, headers);
        calculateAndDisplayStatistics(parsedData, headers);
        populateDistributionColumnSelect(headers);
        populateAxisSelects(headers, parsedData); // Populate universal axis selects using global data

        // Show relevant sections on home.html after data upload
        if (dataHeadSection) dataHeadSection.classList.remove('hidden');
        if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.remove('hidden');
        if (columnDistributionSection) columnDistributionSection.classList.remove('hidden');
        if (showDataOverviewBtn) showDataOverviewBtn.classList.remove('hidden');
        if (showPlottingSectionBtn) showPlottingSectionBtn.classList.remove('hidden');

        // Also show general plotting and saved graphs sections which are now managed by main.js
        const plottingControlsSection = document.getElementById('plottingControlsSection');
        const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
        const savedGraphsSection = document.getElementById('savedGraphsSection');
        if (plottingControlsSection) plottingControlsSection.classList.remove('hidden');
        if (mostRecentGraphSection) mostRecentGraphSection.classList.remove('hidden');
        if (savedGraphsSection) savedGraphsSection.classList.remove('hidden');

        // Draw an initial default chart on home page after file load
        if (myChartCanvas && xAxisSelect && yAxisSelect && chartTypeSelect && yAxisAggregationSelect) {
            drawChart(
                myChartCanvas,
                xAxisSelect,
                yAxisSelect,
                chartTypeSelect,
                yAxisAggregationSelect,
                null, // xAxisFilterInput (not typically on home)
                null, // startDateInput (not typically on home)
                null, // endDateInput (not typically on home)
                parsedData,
                headers,
                showMessageBox,
                saveGraphBtn,
                exportGraphBtn,
                recentGraphDescription,
                recentSavedChartCanvas
            );
        }

    } catch (error) {
        console.error('Error loading or parsing CSV:', error);
        showMessageBox(`Error loading CSV: ${error.message}. Please try again.`);
        resetHomeUI(); // Reset home specific UI on error
    }
}

/**
 * Displays the first few rows of the parsed data in a table.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {Array<string>} headers - The array of column headers.
 */
function displayDataHead(data, headers) {
    if (!dataHeadSection || !dataHeadTable) return;

    dataHeadTable.innerHTML = ''; // Clear previous content
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    const rowsToShow = Math.min(data.length, 5); // Display first 5 rows
    for (let i = 0; i < rowsToShow; i++) {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${data[i][header]}</td>`;
        });
        tableHTML += '</tr>';
    }
    tableHTML += '</tbody>';
    dataHeadTable.innerHTML = tableHTML;
    dataHeadSection.classList.remove('hidden');
}

/**
 * Calculates and displays basic descriptive statistics for numeric columns.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {Array<string>} headers - The array of column headers.
 */
function calculateAndDisplayStatistics(data, headers) {
    if (!descriptiveStatisticsSection || !statisticsTable) return;

    statisticsTable.innerHTML = ''; // Clear previous content
    let statsHTML = '<thead><tr><th>Statistic</th>';
    const numericHeaders = headers.filter(header => data.some(row => typeof row[header] === 'number' && !isNaN(row[header])));

    if (numericHeaders.length === 0) {
        descriptiveStatisticsSection.classList.add('hidden');
        return;
    }

    numericHeaders.forEach(header => {
        statsHTML += `<th>${header}</th>`;
    });
    statsHTML += '</tr></thead><tbody>';

    const statistics = {
        'Count': col => col.length,
        'Min': col => Math.min(...col),
        'Max': col => Math.max(...col),
        'Sum': col => col.reduce((sum, val) => sum + val, 0),
        'Average': col => col.reduce((sum, val) => sum + val, 0) / col.length,
        'Median': col => {
            const sorted = [...col].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        },
        'Standard Deviation': col => {
            if (col.length < 2) return 0; // Standard deviation requires at least 2 data points
            const mean = col.reduce((sum, val) => sum + val, 0) / col.length;
            return Math.sqrt(col.map(val => (val - mean) ** 2).reduce((sum, sq) => sum + sq, 0) / col.length);
        }
    };

    for (const statName in statistics) {
        statsHTML += `<tr><td>${statName}</td>`;
        numericHeaders.forEach(header => {
            const columnData = data.map(row => row[header]).filter(val => typeof val === 'number' && !isNaN(val));
            if (columnData.length > 0) {
                const value = statistics[statName](columnData);
                statsHTML += `<td>${typeof value === 'number' ? value.toFixed(2) : 'N/A'}</td>`;
            } else {
                statsHTML += `<td>N/A</td>`;
            }
        });
        statsHTML += '</tr>';
    }

    statsHTML += '</tbody>';
    statisticsTable.innerHTML = statsHTML;
    descriptiveStatisticsSection.classList.remove('hidden');
}

/**
 * Populates the dropdown for selecting a column for distribution.
 * @param {Array<string>} headers - The array of column headers.
 */
function populateDistributionColumnSelect(headers) {
    if (!distributionColumnSelect) return;
    distributionColumnSelect.innerHTML = '<option value="">Select Column</option>'; // Clear existing options
    headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        distributionColumnSelect.appendChild(option);
    });
    columnDistributionSection.classList.remove('hidden');
}


/**
 * Draws a bar chart showing the distribution of unique values for a selected column.
 * Handles both numeric (histograms with bins) and categorical data.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {string} column - The selected column for distribution.
 */
function drawColumnDistributionChart(data, column) {
    if (!distributionChartCanvas || !column) {
        if (myDistributionChart) {
            myDistributionChart.destroy();
            myDistributionChart = null;
        }
        return;
    }

    if (myDistributionChart) {
        myDistributionChart.destroy(); // Destroy previous chart instance
    }

    const ctx = distributionChartCanvas.getContext('2d');
    const columnData = data.map(row => row[column]);

    let chartConfig = {};

    // Check if the column data is primarily numeric
    const isNumeric = columnData.every(val => typeof val === 'number' || val === null || val === undefined || val === '');
    const numericValues = columnData.filter(val => typeof val === 'number' && !isNaN(val));

    if (isNumeric && numericValues.length > 0) {
        // Numeric data: create a histogram
        const numBins = 10; // You can make this configurable
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const binSize = (max - min) / numBins;

        const bins = Array(numBins).fill(0);
        const labels = [];

        for (let i = 0; i < numBins; i++) {
            const lowerBound = min + i * binSize;
            const upperBound = min + (i + 1) * binSize;
            labels.push(`${lowerBound.toFixed(2)}-${upperBound.toFixed(2)}`);
        }

        numericValues.forEach(value => {
            let binIndex = Math.floor((value - min) / binSize);
            if (binIndex === numBins) { // Handle max value falling into the last bin
                binIndex--;
            }
            if (binIndex >= 0 && binIndex < numBins) {
                bins[binIndex]++;
            }
        });

        chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Frequency of ${column}`,
                    data: bins,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Distribution of ${column} (Histogram)`,
                        color: '#06f7b1' // Ensure title visibility
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: column,
                            color: '#06f7b1' // Ensure label visibility
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Light grid lines
                        },
                        ticks: {
                            color: 'white' // White tick labels
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequency',
                            color: '#06f7b1' // Ensure label visibility
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)' // Light grid lines
                        },
                        ticks: {
                            color: 'white' // White tick labels
                        }
                    }
                }
            }
        };

    } else {
        // Categorical data: count unique occurrences
        const counts = {};
        columnData.forEach(value => {
            const val = String(value).trim(); // Ensure string and trim whitespace
            if (val) { // Ignore empty strings or nulls
                counts[val] = (counts[val] || 0) + 1;
            }
        });

        const labels = Object.keys(counts);
        const dataValues = Object.values(counts);

        chartConfig = {
            type: 'bar', // Bar chart for categorical distribution
            data: {
                labels: labels,
                datasets: [{
                    label: `Count of ${column}`,
                    data: dataValues,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Distribution of ${column}`,
                        color: '#06f7b1'
                    },
                    legend: {
                        labels: {
                            color: 'white' // Legend text color
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: column,
                            color: '#06f7b1'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Count',
                            color: '#06f7b1'
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    }
                }
            }
        };
    }

    myDistributionChart = new Chart(ctx, chartConfig);
}

/**
 * Initializes the UI and event listeners for the home page.
 */
async function initializeHomePage() {
    console.log("[Home.js] Initializing home page UI and listeners.");

    // Retrieve file name from local storage on load
    const savedFileName = localStorage.getItem('csvPlotterFileName');
    if (savedFileName) {
        if (fileNameDisplay) fileNameDisplay.textContent = savedFileName;
        // If file name exists, assume data might be in IndexedDB,
        // The main.js's initializeUIForCurrentPage has already loaded data into `parsedData` and `headers`
        if (parsedData && parsedData.length > 0) {
            displayDataHead(parsedData, headers);
            calculateAndDisplayStatistics(parsedData, headers);
            populateDistributionColumnSelect(headers);
            populateAxisSelects(headers, parsedData); // Populate universal axis selects using global data

            if (showDataOverviewBtn) showDataOverviewBtn.classList.remove('hidden');
            if (showPlottingSectionBtn) showPlottingSectionBtn.classList.remove('hidden');
            // Main.js already controls the visibility of common plotting sections and chart redraw
        }
    } else {
        resetHomeUI(); // Ensure all home-specific sections are hidden if no file name
    }

    // --- Home-specific Event Listeners ---

    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVFile);
    }

    if (showDataOverviewBtn) {
        showDataOverviewBtn.addEventListener('click', () => {
            if (parsedData && parsedData.length > 0) {
                if (dataHeadSection) dataHeadSection.classList.remove('hidden');
                if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.remove('hidden');
                if (columnDistributionSection) columnDistributionSection.classList.remove('hidden');
                // Hide plotting controls and charts when showing data overview
                const plottingControlsSection = document.getElementById('plottingControlsSection');
                const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
                const savedGraphsSection = document.getElementById('savedGraphsSection');
                if (plottingControlsSection) plottingControlsSection.classList.add('hidden');
                if (mostRecentGraphSection) mostRecentGraphSection.classList.add('hidden');
                if (savedGraphsSection) savedGraphsSection.classList.add('hidden'); // Also hide saved graphs section
                clearChartInstances(); // Clear main chart instances
            } else {
                showMessageBox('Please upload a CSV file first.');
            }
        });
    }

    if (showPlottingSectionBtn) {
        showPlottingSectionBtn.addEventListener('click', () => {
            if (parsedData && parsedData.length > 0) {
                const plottingControlsSection = document.getElementById('plottingControlsSection');
                const mostRecentGraphSection = document.getElementById('mostRecentGraphSection');
                const savedGraphsSection = document.getElementById('savedGraphsSection');
                if (plottingControlsSection) plottingControlsSection.classList.remove('hidden');
                if (mostRecentGraphSection) mostRecentGraphSection.classList.remove('hidden');
                if (savedGraphsSection) savedGraphsSection.classList.remove('hidden'); // Show saved graphs
                // Hide data overview sections
                if (dataHeadSection) dataHeadSection.classList.add('hidden');
                if (descriptiveStatisticsSection) descriptiveStatisticsSection.classList.add('hidden');
                if (columnDistributionSection) columnDistributionSection.classList.add('hidden');

                // Re-populate and draw if needed - main.js's initializeUIForCurrentPage handles initial draw.
                // This button's primary role is just to toggle visibility of sections.
                // Re-plotting should be done via the main "Plot Graph" button.
            } else {
                showMessageBox('No data loaded. Please upload a CSV file first.');
            }
        });
    }

    if (distributionColumnSelect) {
        distributionColumnSelect.addEventListener('change', (event) => {
            drawColumnDistributionChart(parsedData, event.target.value);
        });
    }
}

// Attach the initialization function to the DOMContentLoaded event
// This will run AFTER main.js's DOMContentLoaded, ensuring parsedData/headers are available.
window.addEventListener('DOMContentLoaded', initializeHomePage);
