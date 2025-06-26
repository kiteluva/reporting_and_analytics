// complex_stats.js
// This file contains logic specific to complex_stats.html,
// including correlation matrix and multiple linear regression (MLR).

import { populateAxisSelects } from './charting.js'; // Assuming showMessageBox is also exported from charting or ui-components
import { parsedData, headers } from './data-handlers.js'; // Import global data
import { showMessageBox as showUIMessageBox } from './ui-components.js'; // Alias to avoid conflict if showMessageBox is also in charting.js

// --- DOM Elements specific to complex_stats.html ---
const calculateCorrelationBtn = document.getElementById('plotCorrelationBtn'); // Corrected ID to match HTML
const correlationColumnsSelect = document.getElementById('correlationColumnsSelect');
const correlationMatrixOutput = document.getElementById('correlationMatrixOutput');
const correlationMatrixContainer = document.getElementById('correlationMatrixContainer'); // Container for the table
const correlationOrderSelect = document.getElementById('correlationOrderSelect'); // Added for sorting

const calculateRegressionBtn = document.getElementById('runRegressionBtn'); // Corrected ID to match HTML
const yAxisSelectMLR = document.getElementById('yAxisSelectMLR');
const xAxisSelectMLR = document.getElementById('xAxisSelectMLR');
const regressionResultsOutput = document.getElementById('regressionResultsOutput');
const regressionResultsText = document.getElementById('regressionResultsText');
const getRegressionInterpretationBtn = document.getElementById('getRegressionInterpretationBtn');
const regressionInsightsOutput = document.getElementById('regressionInsightsOutput');
const regressionInsightsText = document.getElementById('regressionInsightsText');
const regressionInsightsLoading = document.getElementById('regressionInsightsLoading');


/**
 * Calculates the Pearson correlation coefficient between two arrays.
 * @param {number[]} x - Array of x values.
 * @param {number[]} y - Array of y values.
 * @returns {number} The correlation coefficient.
 */
function calculatePearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0 || n !== y.length) return NaN;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((val, i) => val * y[i]).reduce((a, b) => a + b, 0);
    const sumX2 = x.map(val => val * val).reduce((a, b) => a + b, 0);
    const sumY2 = y.map(val => val * val).reduce((a, b) => a + b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Displays the correlation matrix for selected numeric columns.
 * @param {Array<Object>} data - The parsed CSV data.
 * @param {string[]} columns - The array of column names to include in the matrix.
 * @param {string} orderBy - The order for displaying columns (e.g., 'alphabetical', 'strongest-positive').
 */
function displayCorrelationMatrix(data, columns, orderBy = 'alphabetical') {
    if (!correlationMatrixContainer) return;

    if (columns.length < 2) {
        correlationMatrixContainer.innerHTML = '<p class="text-gray-600 text-center">Select at least two numeric columns to calculate correlation.</p>';
        if (correlationMatrixContainer.classList.contains('hidden')) {
            correlationMatrixContainer.classList.remove('hidden'); // Ensure message is visible
        }
        return;
    }

    const numericColumnsData = {};
    columns.forEach(colName => {
        numericColumnsData[colName] = data
            .map(row => row[colName])
            .filter(val => typeof val === 'number' && !isNaN(val));
    });

    // Filter out columns that don't have enough numeric data (at least 2 points for correlation)
    let validColumns = columns.filter(colName => numericColumnsData[colName].length > 1);

    if (validColumns.length < 2) {
        correlationMatrixContainer.innerHTML = '<p class="text-gray-600 text-center">Selected columns do not contain enough numeric data for correlation calculation (at least 2 valid numbers per column needed).</p>';
        if (correlationMatrixContainer.classList.contains('hidden')) {
            correlationMatrixContainer.classList.remove('hidden'); // Ensure message is visible
        }
        return;
    }

    // Sort validColumns based on orderBy
    if (orderBy !== 'alphabetical' && validColumns.length > 1) {
        // Calculate correlations to determine sort order
        const correlations = {};
        for (let i = 0; i < validColumns.length; i++) {
            for (let j = i + 1; j < validColumns.length; j++) {
                const col1 = validColumns[i];
                const col2 = validColumns[j];
                const corr = calculatePearsonCorrelation(
                    numericColumnsData[col1],
                    numericColumnsData[col2]
                );
                // Store correlation for sorting purposes, using a key that ensures uniqueness and accessibility
                correlations[`${col1}-${col2}`] = corr;
                correlations[`${col2}-${col1}`] = corr; // Store reverse for easy lookup
            }
        }

        validColumns.sort((a, b) => {
            // Use the average absolute correlation with other columns for sorting, or a specific "strongest" with first column
            // For simplicity in automatic sorting, let's sort by their average absolute correlation with all other columns.
            // This can be customized if a specific 'anchor' column is preferred for sorting.
            const getAverageAbsCorrelation = (col) => {
                let sumAbsCorr = 0;
                let count = 0;
                validColumns.forEach(otherCol => {
                    if (col !== otherCol) {
                        const corr = correlations[`${col}-${otherCol}`];
                        if (!isNaN(corr)) {
                            sumAbsCorr += Math.abs(corr);
                            count++;
                        }
                    }
                });
                return count > 0 ? sumAbsCorr / count : 0;
            };

            const avgAbsA = getAverageAbsCorrelation(a);
            const avgAbsB = getAverageAbsCorrelation(b);

            if (orderBy === 'strongest-positive') {
                 // Sort by how positively correlated they are, generally against a reference (e.g., first selected or just overall average)
                 // This requires a more complex sorting strategy, as a column's "strongest positive" isn't intrinsic.
                 // For now, let's just sort by strongest overall absolute correlation if not alphabetical,
                 // and the user can interpret. True "strongest positive" would need a reference column.
                 return avgAbsB - avgAbsA; // Placeholder: fallback to strongest absolute
            } else if (orderBy === 'strongest-negative') {
                 return avgAbsB - avgAbsA; // Placeholder: fallback to strongest absolute
            } else if (orderBy === 'strongest-absolute') {
                return avgAbsB - avgAbsA;
            }
            return 0; // Should not reach here if `orderBy` is handled
        });
    }

    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-md text-center">
            <thead class="bg-indigo-600 text-white">
                <tr>
                    <th class="px-3 py-2 text-xs font-medium uppercase tracking-wider sticky-col">Column</th>
    `;
    validColumns.forEach(col => {
        tableHTML += `<th class="px-3 py-2 text-xs font-medium uppercase tracking-wider">${col}</th>`;
    });
    tableHTML += `
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 text-gray-900">
    `;

    validColumns.forEach(rowCol => {
        tableHTML += `<tr><td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-indigo-700 sticky-col-data">${rowCol}</td>`;
        validColumns.forEach(colCol => {
            const correlation = calculatePearsonCorrelation(
                numericColumnsData[rowCol],
                numericColumnsData[colCol]
            );
            const formattedCorrelation = isNaN(correlation) ? 'N/A' : correlation.toFixed(3);
            let cellClass = '';
            // Apply color coding for correlations
            const absCorrelation = Math.abs(correlation);
            if (!isNaN(correlation)) {
                if (absCorrelation >= 0.8) cellClass = 'bg-red-200'; // Very strong
                else if (absCorrelation >= 0.6) cellClass = 'bg-red-100'; // Strong
                else if (absCorrelation >= 0.4) cellClass = 'bg-yellow-100'; // Moderate
                else if (absCorrelation >= 0.2) cellClass = 'bg-blue-50'; // Weak
                else cellClass = 'bg-gray-50'; // Very weak/none

                if (correlation < 0) { // Add a darker shade for negative correlations
                    cellClass += ' text-red-800'; // Darker text for negative
                } else if (correlation > 0) {
                     cellClass += ' text-green-800'; // Darker text for positive
                }
            } else {
                cellClass = 'bg-gray-100 text-gray-500';
            }


            tableHTML += `<td class="px-3 py-2 whitespace-nowrap text-sm ${cellClass}">${formattedCorrelation}</td>`;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `
            </tbody>
        </table>
    `;
    correlationMatrixContainer.innerHTML = tableHTML;
    correlationMatrixContainer.classList.remove('hidden'); // Ensure the container is visible
}


/**
 * Performs Multiple Linear Regression (MLR).
 * This is a simplified example and does NOT implement full MLR.
 * A real MLR would require matrix operations to solve for coefficients.
 * This is a placeholder to show the structure.
 * @param {Array<Object>} data - The parsed data.
 * @param {string} dependentVar - The name of the dependent variable (Y).
 * @param {string[]} independentVars - Array of independent variable names (X).
 */
function performMultipleLinearRegression(data, dependentVar, independentVars) {
    if (!regressionResultsOutput || !regressionResultsText) return;

    regressionResultsOutput.classList.remove('hidden');
    regressionResultsText.textContent = 'Calculating regression...';

    // Filter data for numeric values in selected columns
    const filteredData = data.filter(row => {
        const yVal = row[dependentVar];
        if (typeof yVal !== 'number' || isNaN(yVal)) return false;
        for (const indVar of independentVars) {
            const xVal = row[indVar];
            if (typeof xVal !== 'number' || isNaN(xVal)) return false;
        }
        return true;
    });

    if (filteredData.length < independentVars.length + 2) { // Need more data points than variables for robust regression
        regressionResultsText.textContent = 'Not enough valid data points for regression. Need at least (number of independent variables + 2) valid rows.';
        if (getRegressionInterpretationBtn) getRegressionInterpretationBtn.classList.add('hidden');
        return;
    }

    // --- Simplified Pseudo-MLR Output (NOT ACTUAL CALCULATION) ---
    // A real implementation would use a library or extensive linear algebra.
    const coefficients = {};
    independentVars.forEach(col => {
        // Dummy coefficient for demonstration
        coefficients[col] = (Math.random() * 2 - 1).toFixed(3); // Between -1 and 1
    });
    const intercept = (Math.random() * 10).toFixed(3);
    const rSquared = Math.random().toFixed(2); // Dummy R-squared

    let results = `Multiple Linear Regression Results:\n\n`;
    results += `Dependent Variable (Y): ${dependentVar}\n`;
    results += `Independent Variables (X): ${independentVars.join(', ')}\n\n`;
    results += `Intercept (b0): ${intercept}\n`;
    independentVars.forEach(col => {
        results += `Coefficient for ${col} (b${independentVars.indexOf(col) + 1}): ${coefficients[col]}\n`;
    });
    results += `\nAdjusted R-squared: ${rSquared} (Placeholder - requires actual calculation)\n`;
    results += `\nClick "Get AI Interpretation" for analysis based on these (dummy) results.`;

    regressionResultsText.textContent = results;
    if (getRegressionInterpretationBtn) getRegressionInterpretationBtn.classList.remove('hidden');
}

/**
 * Gets AI interpretation for regression results.
 */
async function getAIInterpretationForRegression() {
    if (!regressionResultsText) return;

    if (regressionInsightsOutput) regressionInsightsOutput.classList.remove('hidden');
    if (regressionInsightsText) regressionInsightsText.textContent = '';
    if (regressionInsightsLoading) regressionInsightsLoading.classList.remove('hidden');

    const regressionSummary = regressionResultsText.textContent;

    const apiKey = "AIzaSyAjF5n8EStCsR8U3xiO2qnIkOLbsRhhONU"; // Your API key
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        // Construct the prompt for the AI
        const prompt = `Analyze the following (dummy) Multiple Linear Regression results and provide a brief interpretation. Focus on the meaning of the Adjusted R-squared and the dummy coefficients. Acknowledge that the data is synthetic.

        Regression Results:
        ${regressionSummary}

        Provide insights on:
        1. How well the independent variables explain the dependent variable (based on R-squared).
        2. The (dummy) impact of independent variables on the dependent variable (positive/negative correlation implied by coefficient sign).
        3. A disclaimer that these are dummy results and a real analysis needs actual calculations.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        let aiInterpretation = "Failed to get AI interpretation."; // Default message

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            aiInterpretation = result.candidates[0].content.parts[0].text;
        } else {
            console.error("AI response structure unexpected:", result);
            aiInterpretation = "Could not parse AI interpretation. Please try again or check console for errors.";
        }

        if (regressionInsightsText) regressionInsightsText.textContent = aiInterpretation;

    } catch (error) {
        console.error('Error fetching AI interpretation:', error);
        if (regressionInsightsText) regressionInsightsText.textContent = 'Error fetching AI interpretation. Please check your network connection or API key.';
    } finally {
        if (regressionInsightsLoading) regressionInsightsLoading.classList.add('hidden');
    }
}


/**
 * Initializes the UI and event listeners for the complex stats page.
 * This runs after main.js's DOMContentLoaded.
 */
async function initializeComplexStatsPage() {
    console.log("[Complex_Stats.js] Initializing complex stats page UI and listeners.");

    const fileNameDisplay = document.getElementById('fileName');
    const currentPage = window.location.pathname.split('/').pop();

    // Check if data is loaded. `parsedData` and `headers` are globally imported from data-handlers.js.
    if (parsedData.length > 0 && headers.length > 0) {
        // Update file name display (if it's not set by main.js)
        const savedFileName = localStorage.getItem('csvPlotterFileName');
        if (fileNameDisplay && savedFileName) {
            fileNameDisplay.textContent = `Selected file: ${savedFileName} (Data loaded from storage)`;
        } else if (fileNameDisplay) {
            fileNameDisplay.textContent = `Data loaded: ${parsedData.length} rows, ${headers.length} columns`;
        }

        // Ensure correlation and regression sections are visible if data is loaded
        const correlationSection = document.getElementById('correlationSection');
        const regressionSection = document.getElementById('regressionSection');
        if (correlationSection) correlationSection.classList.remove('hidden');
        if (regressionSection) regressionSection.classList.remove('hidden');

        const numericHeaders = headers.filter(header => parsedData.some(row => typeof row[header] === 'number' && !isNaN(row[header])));

        // Populate Correlation Columns Select
        if (correlationColumnsSelect) {
            correlationColumnsSelect.innerHTML = ''; // Clear existing options
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                correlationColumnsSelect.appendChild(option);
            });
            // Select all numeric columns by default for correlation
            Array.from(correlationColumnsSelect.options).forEach(option => {
                option.selected = true;
            });
        }

        // Populate MLR selects
        if (yAxisSelectMLR) {
            yAxisSelectMLR.innerHTML = '<option value="">Select Dependent Variable (Y)</option>';
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                yAxisSelectMLR.appendChild(option);
            });
            if (numericHeaders.length > 0) yAxisSelectMLR.value = numericHeaders[0]; // Pre-select first numeric
        }
        if (xAxisSelectMLR) {
            xAxisSelectMLR.innerHTML = ''; // Clear existing options
            numericHeaders.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                xAxisSelectMLR.appendChild(option);
            });
            // Auto-select all but the default dependent variable
            if (yAxisSelectMLR && numericHeaders.length > 1) {
                const defaultY = yAxisSelectMLR.value;
                Array.from(xAxisSelectMLR.options).forEach(option => {
                    if (option.value !== "" && option.value !== defaultY) {
                        option.selected = true;
                    }
                });
            }
        }

        // Attempt to run default calculations if suitable columns are auto-selected
        if (correlationColumnsSelect && Array.from(correlationColumnsSelect.selectedOptions).length >= 2) {
            const selectedCols = Array.from(correlationColumnsSelect.selectedOptions).map(option => option.value);
            displayCorrelationMatrix(parsedData, selectedCols, correlationOrderSelect ? correlationOrderSelect.value : 'alphabetical');
        } else {
             if (correlationMatrixContainer) {
                correlationMatrixContainer.innerHTML = '<p class="text-gray-600 text-center">Select at least two numeric columns and click "Generate Correlation Matrix".</p>';
                correlationMatrixContainer.classList.remove('hidden');
            }
        }

        if (yAxisSelectMLR && xAxisSelectMLR && yAxisSelectMLR.value && Array.from(xAxisSelectMLR.selectedOptions).length > 0) {
            const dependentVar = yAxisSelectMLR.value;
            const independentVars = Array.from(xAxisSelectMLR.selectedOptions).map(option => option.value);
            const finalIndependentVars = independentVars.filter(col => col !== dependentVar); // Ensure Y is not in X
            if (finalIndependentVars.length > 0) {
                performMultipleLinearRegression(parsedData, dependentVar, finalIndependentVars);
            } else {
                if (regressionResultsOutput) {
                    regressionResultsOutput.innerHTML = `<h3 class="text-lg font-semibold mb-2 section-title">Regression Results</h3><pre id="regressionResultsText" class="whitespace-pre-wrap text-sm">Select dependent and independent variables for regression.</pre>`;
                    regressionResultsOutput.classList.remove('hidden');
                }
            }
        } else {
            if (regressionResultsOutput) {
                regressionResultsOutput.innerHTML = `<h3 class="text-lg font-semibold mb-2 section-title">Regression Results</h3><pre id="regressionResultsText" class="whitespace-pre-wrap text-sm">Select dependent and independent variables for regression.</pre>`;
                regressionResultsOutput.classList.remove('hidden');
            }
        }


    } else {
        // This block will execute if no data is loaded at all
        showUIMessageBox("No data loaded. Please upload a CSV file on the Home page first to perform complex analysis.");
        // Ensure all operation-specific sections are hidden if no data
        const correlationSection = document.getElementById('correlationSection');
        const regressionSection = document.getElementById('regressionSection');
        if (correlationSection) correlationSection.classList.add('hidden');
        if (regressionSection) regressionSection.classList.add('hidden');
        if (correlationMatrixContainer) correlationMatrixContainer.classList.add('hidden');
        if (regressionResultsOutput) regressionResultsOutput.classList.add('hidden');
        if (getRegressionInterpretationBtn) getRegressionInterpretationBtn.classList.add('hidden');
        if (regressionInsightsOutput) regressionInsightsOutput.classList.add('hidden');

        // Reset file name display as well
        if (fileNameDisplay) fileNameDisplay.textContent = 'No file selected. Please upload a CSV on the Home page.';
    }

    // --- Complex Stats-specific Event Listeners ---
    if (calculateCorrelationBtn) {
        calculateCorrelationBtn.addEventListener('click', () => {
            if (parsedData.length === 0) {
                showUIMessageBox("No data loaded. Please upload a CSV file first.");
                return;
            }
            const selectedColumns = Array.from(correlationColumnsSelect.selectedOptions).map(option => option.value);
            const orderBy = correlationOrderSelect ? correlationOrderSelect.value : 'alphabetical';
            displayCorrelationMatrix(parsedData, selectedColumns, orderBy);
        });
    }

    if (calculateRegressionBtn) {
        calculateRegressionBtn.addEventListener('click', () => {
            if (parsedData.length === 0) {
                showUIMessageBox("No data loaded. Please upload a CSV file first.");
                return;
            }
            const dependentVar = yAxisSelectMLR.value;
            const independentVars = Array.from(xAxisSelectMLR.selectedOptions).map(option => option.value);

            if (!dependentVar || independentVars.length === 0) {
                showUIMessageBox("Please select at least one dependent and one independent variable for regression.");
                return;
            }

            // Ensure dependent variable is not among independent variables
            const finalIndependentVars = independentVars.filter(col => col !== dependentVar);
            if (finalIndependentVars.length === 0 && independentVars.length > 0) {
                 showUIMessageBox("Dependent variable cannot also be an independent variable. Please adjust your selection.");
                 return;
            }

            performMultipleLinearRegression(parsedData, dependentVar, finalIndependentVars);
        });
    }

    if (getRegressionInterpretationBtn) {
        getRegressionInterpretationBtn.addEventListener('click', getAIInterpretationForRegression);
    }

    // Add listener for correlation order change to re-render
    if (correlationOrderSelect) {
        correlationOrderSelect.addEventListener('change', () => {
            if (parsedData.length > 0 && correlationColumnsSelect && Array.from(correlationColumnsSelect.selectedOptions).length >= 2) {
                const selectedColumns = Array.from(correlationColumnsSelect.selectedOptions).map(option => option.value);
                const orderBy = correlationOrderSelect.value;
                displayCorrelationMatrix(parsedData, selectedColumns, orderBy);
            }
        });
    }
}

// Attach the initialization function to the DOMContentLoaded event
// This will run after main.js's DOMContentLoaded, ensuring parsedData/headers are available.
window.addEventListener('DOMContentLoaded', initializeComplexStatsPage);
