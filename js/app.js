// ---------------------------------------------
// MAIN APPLICATION
// ---------------------------------------------
import { getHashParams, setHashParams } from './utils.js';
import { computeCompoundInterest, computeDebtPayoff, computeEmergencyFund, computeSavingsRate, computeGoalTimeline, computeRefinanceBreakeven, computeBudgetSplitter, computeExtraPayment, computeCreditCardMinimum, computeDebtToIncome } from './engines.js';
import { $, renderNav, renderForm, renderResults, getFormState } from './ui.js';

// Engine registry
const ENGINES = { 
  computeCompoundInterest, 
  computeDebtPayoff,
  computeEmergencyFund,
  computeSavingsRate,
  computeGoalTimeline,
  computeRefinanceBreakeven,
  computeBudgetSplitter,
  computeExtraPayment,
  computeCreditCardMinimum,
  computeDebtToIncome
};

// Global state
let calculators = {};
let current = getHashParams();

// Load calculator configurations
async function loadCalculators() {
  // Try per-page local config, then merge in global registries so nav shows all
  const candidates = [
    './calculator.json',
    './config/calculators.json'
  ];
  const merged = {};
  for (const path of candidates) {
    try {
      console.log('Attempting to load calculators from:', path);
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data) continue;
      if (data && data.id && data.inputs && data.compute) {
        // Single calculator file (per-page)
        merged[data.id] = data;
      } else if (typeof data === 'object') {
        // Registry of calculators
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') merged[key] = val;
        }
      }
      console.log('Loaded from', path, 'current merged keys:', Object.keys(merged));
    } catch (err) {
      console.warn('Failed to load from', path, err);
    }
  }
  calculators = merged;
  if (!Object.keys(calculators).length) {
    console.error('No calculator configs found.');
  }
}

function run(config) {
  const state = getFormState(config);
  setHashParams(config.id, state);
  const fn = ENGINES[config.compute];
  if (!fn) {
    console.error(`Engine ${config.compute} not found`);
    return;
  }
  const results = fn(state);
  renderResults(config, results, calculators);
  window.__lastResults = results; // for CSV export
}

function selectCalc(id) {
  console.log('selectCalc called with id:', id); // Debug log
  const config = calculators[id];
  if (!config) return;
  
  const state = Object.assign(
    {}, 
    Object.fromEntries(config.inputs.map(f => [f.name, f.default])), 
    current.state || {}
  );
  
  renderForm(config, state, ENGINES, run);
  $('#explainer').textContent = config.explainer;
  

  
  current = { calc: id, state };
}

// Initialize application
async function init() {
  console.log('App initialization started');
  console.log('Window calculatorId:', window.calculatorId);
  
    // If on an individual calculator page, render immediately from local config (faster, avoids fetch issues)
    if (window.calculatorId) {
      console.log('Individual calculator page detected:', window.calculatorId);
      // Check if we have a local config for this calculator
      if (window.calculatorConfig && window.calculatorConfig.id === window.calculatorId) {
        console.log('Using local calculator config:', window.calculatorId);
        const config = window.calculatorConfig;
        
        // Initialize with default values
        const state = Object.assign(
          {}, 
          Object.fromEntries(config.inputs.map(f => [f.name, f.default])), 
          current.state || {}
        );
        
        current = { calc: window.calculatorId, state };
        
        // Render the form and results
        renderForm(config, state, ENGINES, run);
        $('#explainer').textContent = config.explainer;
        
        // Run initial calculation
        run(config);

        // Load global calculators config in background to populate nav
        try {
          await loadCalculators();
          if (Object.keys(calculators).length > 0) {
            renderNav(calculators, window.calculatorId);
          }
        } catch (e) {
          console.warn('Background load of calculators failed, nav will be empty');
        }
      } else if (calculators[window.calculatorId]) {
        console.log('Calculator found in loaded config, initializing:', window.calculatorId);
        const config = calculators[window.calculatorId];
        
        // Initialize with default values
        const state = Object.assign(
          {}, 
          Object.fromEntries(config.inputs.map(f => [f.name, f.default])), 
          current.state || {}
        );
        
        current = { calc: window.calculatorId, state };
        
        // Render the form and results
        renderForm(config, state, ENGINES, run);
        $('#explainer').textContent = config.explainer;
        
        // Run initial calculation
        run(config);
        
        // Render navigation for this calculator
        renderNav(calculators, window.calculatorId);
      } else {
        console.error('Calculator not found:', window.calculatorId);
        console.error('Available calculators:', Object.keys(calculators));
        console.error('Local config available:', !!window.calculatorConfig);
      }
      return;
    }
  
  // Not an individual calculator page; load global config and proceed
  await loadCalculators();
  console.log('Calculators loaded:', Object.keys(calculators));
  
  // Original logic for main calculator page
  current = getHashParams();
  console.log('Initial hash params:', current); // Debug log
  
  renderNav(calculators, current.calc);
  
  // Handle hash changes
  window.addEventListener('hashchange', () => {
    console.log('Hash changed to:', location.hash); // Debug log
    current = getHashParams();
    console.log('Parsed hash params:', current); // Debug log
    selectCalc(current.calc);
  });
  
  // Initial load - ensure we have a valid calculator
  if (current.calc && calculators[current.calc]) {
    console.log('Loading calculator:', current.calc); // Debug log
    selectCalc(current.calc);
  } else {
    console.log('No valid calculator found, using default'); // Debug log
    // Fallback to first available calculator
    const firstCalc = Object.keys(calculators)[0];
    if (firstCalc) {
      current.calc = firstCalc;
      selectCalc(firstCalc);
    }
  }
}

// Start the application
init();
