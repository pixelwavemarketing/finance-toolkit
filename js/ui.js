// ---------------------------------------------
// UI RENDERING
// ---------------------------------------------
import { $$, $$$, fmtCurrency, fmtNumber, toNum, downloadCSV, copy, setHashParams } from './utils.js';

let chart;

export const $ = (id) => document.getElementById(id.replace('#',''));

export function renderNav(calculators, active){
  const navEl = $('#nav');
  // Mobile dropdown elements removed from header; keep references null
  const navDropdown = null;
  const navCurrent = null;
  const navToggle = null;
  
  // Desktop navigation - link to dedicated pages
  const desktopLinks = Object.values(calculators).map(c=>{
    // Use absolute path from root to avoid relative path issues
    const href = `/calculators/${c.id}/`;
    console.log(`Generating desktop link for ${c.id}: ${href}`);
    
    // Add active class and styling if this is the current calculator
    const isActive = active && c.id === active;
    const activeClass = isActive ? 'active' : '';
    const activeStyle = isActive ? 'style="background: var(--accent); color: white; border-radius: 8px; padding: 8px 12px;"' : '';
    
    return `<a href="${href}" data-calc-id="${c.id}" class="${activeClass}" ${activeStyle}>${c.title}</a>`;
  }).join('');
  
  navEl.innerHTML = desktopLinks;
  
  // Mobile navigation (disabled: we now show calculator chips on mobile)
  if (false && navDropdown && navCurrent) {
    const mobileLinks = Object.values(calculators).map(c=>{
      // Use absolute path from root to avoid relative path issues
      const href = `/calculators/${c.id}/`;
      console.log(`Generating mobile link for ${c.id}: ${href}`);
      return `<a href="${href}" data-calc-id="${c.id}">${c.title}</a>`;
    }).join('');
    
    navDropdown.innerHTML = mobileLinks;
    
    // Show current calculator name if available, else All Calculators
    if (active && calculators[active]) {
      navCurrent.textContent = calculators[active].title;
    } else {
      navCurrent.textContent = 'All Calculators';
    }
    
    // Setup mobile dropdown functionality
    if (navToggle && !navToggle.hasAttribute('data-initialized')) {
      navToggle.setAttribute('data-initialized', 'true');
      
      // iOS detection (covers iPhone/iPad and iPadOS in desktop mode)
      const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      // Track original parent for dropdown so we can restore after closing
      let originalParent = navDropdown.parentNode;
      let originalNextSibling = navDropdown.nextSibling;

      function positionDropdownFixed() {
        const dropdown = $('#navDropdown');
        if (!dropdown) return;
        const rect = navToggle.getBoundingClientRect();
        // For position: fixed, use viewport coordinates (no scroll offset)
        const top = Math.round(rect.bottom);
        const left = Math.round(rect.left);
        const width = Math.round(rect.width);
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.width = `${width}px`;
        dropdown.style.right = 'auto';
        dropdown.style.maxHeight = '60vh';
        dropdown.style.zIndex = '2147483647';
        dropdown.style.webkitTransform = 'translateZ(0)';
        dropdown.style.transform = 'translateZ(0)';
      }

      // Overlay management for small screens
      let overlayEl = null;
      let overlayPanelEl = null;
      let sheetEl = null;

      function openOverlayWithDropdown() {
        const dropdown = $('#navDropdown');
        if (!dropdown) return;
        // Create overlay
        overlayEl = document.createElement('div');
        overlayEl.id = 'mobileMenuOverlay';
        Object.assign(overlayEl.style, {
          position: 'fixed',
          top: '0', left: '0', right: '0', bottom: '0',
          background: 'rgba(0,0,0,0.45)',
          zIndex: '2147483647',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        });
        // Build a dedicated fixed sheet for menu content to avoid any inherited styles
        const headerRect = document.querySelector('header')?.getBoundingClientRect() || { bottom: 0 };
        const top = Math.round(headerRect.bottom);
        sheetEl = document.createElement('div');
        sheetEl.id = 'mobileMenuSheet';
        const rootStyle = getComputedStyle(document.documentElement);
        const cardBg = rootStyle.getPropertyValue('--card') || '#121a35';
        const borderColor = rootStyle.getPropertyValue('--border') || '#1f2a4a';
        const textColor = rootStyle.getPropertyValue('--text') || '#e2e8f0';
        Object.assign(sheetEl.style, {
          position: 'fixed',
          top: `${top}px`,
          left: '0px',
          right: '0px',
          bottom: '0px',
          background: String(cardBg).trim() || '#121a35',
          color: String(textColor).trim() || '#e2e8f0',
          zIndex: '2147483647',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderTop: `1px solid ${borderColor || '#1f2a4a'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        });
        overlayEl.appendChild(sheetEl);
        document.body.appendChild(overlayEl);
        document.body.classList.add('menu-overlay-open');

        // Populate sheet with menu items (clone to avoid moving original)
        const menuContainer = document.createElement('div');
        Object.assign(menuContainer.style, {
          padding: '8px 12px'
        });
        menuContainer.innerHTML = dropdown.innerHTML || '';
        sheetEl.appendChild(menuContainer);
        // Ensure links close the sheet
        menuContainer.querySelectorAll('a').forEach(a => {
          a.addEventListener('click', () => {
            closeOverlayWithDropdown();
          });
        });
        // Keep original dropdown hidden
        dropdown.style.display = 'none';

        // Prevent background scroll
        document.documentElement.dataset.prevOverflow = document.documentElement.style.overflow || '';
        document.body.dataset.prevOverflow = document.body.style.overflow || '';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        // Close on overlay background click
        overlayEl.addEventListener('click', (e) => {
          if (e.target === overlayEl) {
            closeOverlayWithDropdown();
          }
        });
      }

      function closeOverlayWithDropdown() {
        const dropdown = $('#navDropdown');
        if (!dropdown) return;
        document.body.classList.remove('menu-overlay-open');
        // Restore background scroll
        if (document.documentElement.dataset.prevOverflow !== undefined) {
          document.documentElement.style.overflow = document.documentElement.dataset.prevOverflow;
          delete document.documentElement.dataset.prevOverflow;
        }
        if (document.body.dataset.prevOverflow !== undefined) {
          document.body.style.overflow = document.body.dataset.prevOverflow;
          delete document.body.dataset.prevOverflow;
        }
        // Ensure original dropdown remains hidden and clean inline styles
        ['position','top','left','width','right','maxHeight','zIndex','webkitTransform','transform','overflowY','boxShadow','display'].forEach(k => dropdown.style[k] = '');
        // Remove overlay if present
        if (overlayEl && overlayEl.parentNode) {
          overlayEl.parentNode.removeChild(overlayEl);
        }
        sheetEl = null;
        overlayEl = null;
        overlayPanelEl = null;
      }

      function toggleDropdown() {
        const dropdown = $('#navDropdown');
        if (!dropdown) return;
        const nowOpen = dropdown.style.display !== 'block';
        // Use push-down mode on small screens
        const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
        if (nowOpen) {
          if (isSmallScreen) {
            navToggle.classList.add('open');
            openOverlayWithDropdown();
            return;
          }
          // On iOS, move dropdown to body to escape any clipping/stacking contexts
          if (isIOS() && dropdown.parentNode !== document.body) {
            originalParent = dropdown.parentNode;
            originalNextSibling = dropdown.nextSibling;
            document.body.appendChild(dropdown);
            dropdown.dataset.movedToBody = 'true';
          }
          positionDropdownFixed();
          dropdown.style.display = 'block';
          navToggle.classList.add('open');
          // Prevent background scroll to avoid compositing glitches on iOS
          document.documentElement.dataset.prevOverflow = document.documentElement.style.overflow || '';
          document.body.dataset.prevOverflow = document.body.style.overflow || '';
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
        } else {
          if (isSmallScreen) {
            navToggle.classList.remove('open');
            closeOverlayWithDropdown();
            dropdown.style.display = 'none';
            return;
          }
          dropdown.style.display = 'none';
          navToggle.classList.remove('open');
          // Restore background scroll
          if (document.documentElement.dataset.prevOverflow !== undefined) {
            document.documentElement.style.overflow = document.documentElement.dataset.prevOverflow;
            delete document.documentElement.dataset.prevOverflow;
          }
          if (document.body.dataset.prevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset.prevOverflow;
            delete document.body.dataset.prevOverflow;
          }
          // Restore dropdown to its original parent after closing (iOS path)
          if (dropdown.dataset.movedToBody === 'true' && originalParent) {
            if (originalNextSibling) {
              originalParent.insertBefore(dropdown, originalNextSibling);
            } else {
              originalParent.appendChild(dropdown);
            }
            delete dropdown.dataset.movedToBody;
            // Clean up inline styles so default CSS applies when restored
            ['position','top','left','width','right','maxHeight','zIndex','webkitTransform','transform'].forEach(k => dropdown.style[k] = '');
          }
        }
      }
      
      // Handle click/touch
      navToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
      });
      
      // Handle touch for mobile devices
      navToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
      }, { passive: false });
      
      // Close dropdown when clicking a link
      navDropdown.addEventListener('click', (e) => {
        if (e.target.matches('a')) {
          const dropdown = $('#navDropdown');
          dropdown.style.display = 'none';
          navToggle.classList.remove('open');
          // Don't prevent default - let normal navigation work
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navDropdown.contains(e.target)) {
          const dropdown = $('#navDropdown');
          dropdown.style.display = 'none';
          navToggle.classList.remove('open');
          closeOverlayWithDropdown();
          // Restore background scroll
          if (document.documentElement.dataset.prevOverflow !== undefined) {
            document.documentElement.style.overflow = document.documentElement.dataset.prevOverflow;
            delete document.documentElement.dataset.prevOverflow;
          }
          if (document.body.dataset.prevOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset.prevOverflow;
            delete document.body.dataset.prevOverflow;
          }
          if (dropdown.dataset.movedToBody === 'true' && originalParent) {
            if (originalNextSibling) {
              originalParent.insertBefore(dropdown, originalNextSibling);
            } else {
              originalParent.appendChild(dropdown);
            }
            delete dropdown.dataset.movedToBody;
            ['position','top','left','width','right','maxHeight','zIndex','webkitTransform','transform'].forEach(k => dropdown.style[k] = '');
          }
        }
      });

      // Reposition on resize/scroll while open
      window.addEventListener('resize', () => {
        const dropdown = $('#navDropdown');
        if (dropdown && dropdown.style.display === 'block') positionDropdownFixed();
      });
      window.addEventListener('scroll', () => {
        const dropdown = $('#navDropdown');
        if (dropdown && dropdown.style.display === 'block') positionDropdownFixed();
      }, { passive: true });
    }
  }
  
  // Add click handlers for navigation
  addNavClickHandlers(calculators);
}

function addNavClickHandlers(calculators) {
  // Desktop navigation click handlers
  const desktopLinks = document.querySelectorAll('#nav a');
  desktopLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Let normal navigation proceed to dedicated page
    });
  });
  
  // Mobile navigation click handlers
  const mobileLinks = document.querySelectorAll('#navDropdown a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Close dropdown and allow normal navigation to dedicated page
      const dropdown = $('#navDropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    });
  });
}

export function fieldHTML(f, value){
  const v = value ?? f.default ?? '';
  const name = f.name;
  const label = `<label for="f_${name}">${f.label}</label>`;
  
  if (f.type==='select'){
    const opts = f.options.map(o=>
      `<option value="${o.value}" ${o.value===v?'selected':''}>${o.label}</option>`
    ).join('');
    return `<div class="field"><div class="row"><div style="flex:1">${label}<select id="f_${name}" data-name="${name}">${opts}</select></div></div></div>`;
  }
  
  if (f.type==='repeater'){
    const rows = (value && Array.isArray(value) ? value : (f.defaultRows||[]));
    const rowHTML = rows.map((row, idx)=>
      `<div class="debt" data-idx="${idx}">
        <div class="debt-header"><strong>Item ${idx+1}</strong><span class="link" data-action="remove" data-idx="${idx}">Remove</span></div>
        <div class="row">${f.of.map(col=>{
          const rv = row[col.name] ?? col.default ?? '';
          return `<div class="field"><label>${col.label}</label>${inputEl(col, rv, `${name}.${idx}.${col.name}`)}</div>`;
        }).join('')}</div>
      </div>`
    ).join('');
    return `<div class="field"><label>${f.label}</label><div class="debts" id="rep_${name}">${rowHTML}</div><button class="btn" data-action="add-row" data-name="${name}">+ Add</button></div>`;
  }
  
  return `<div class="field">${label}${inputEl(f, v, name)}</div>`;
}

export function inputEl(f, v, path){
  const id = `f_${path.replace(/\./g,'_')}`;
  const common = `id="${id}" data-name="${path}"`;
  
  if (f.type==='currency' || f.type==='percent' || f.type==='number'){
    const step = f.step!=null ? ` step="${f.step}"` : '';
    const min = f.min!=null ? ` min="${f.min}"` : '';
    const max = f.max!=null ? ` max="${f.max}"` : '';
    const val = (typeof v==='number') ? v : (v||'');
    return `<input type="number" inputmode="decimal" ${common} value="${val}"${step}${min}${max}/>`;
  }
  
  if (f.type==='text') {
    return `<input type="text" ${common} value="${v||''}"/>`;
  }
  
  // default
  return `<input type="text" ${common} value="${v||''}"/>`;
}

export function getFormState(config){
  const formEl = $('#form');
  const state = {};
  
  for (const f of config.inputs){
    if (f.type==='repeater'){
      const container = document.getElementById(`rep_${f.name}`);
      const blocks = $$$('.debt', container);
      state[f.name] = blocks.map((b)=>{
        const row = {};
        for (const col of f.of){
          const inp = $$(`[data-name="${f.name}.${b.dataset.idx}.${col.name}"]`, b);
          row[col.name] = (col.type==='currency'||col.type==='percent'||col.type==='number') 
            ? toNum(inp.value) 
            : inp.value;
        }
        return row;
      });
    } else {
      const el = $$(`[data-name="${f.name}"]`, formEl);
      const raw = el?.value ?? f.default;
      state[f.name] = (f.type==='currency'||f.type==='percent'||f.type==='number') 
        ? toNum(raw) 
        : raw;
    }
  }
  return state;
}

export function setFormState(config, state){
  for (const f of config.inputs){
    if (f.type==='repeater'){
      // Re-render repeater
      const html = fieldHTML(f, state[f.name]);
      const wrapper = document.getElementById(`rep_${f.name}`)?.parentElement;
      if (wrapper){ wrapper.outerHTML = html; }
    } else {
      const sel = $$(`[data-name="${f.name}"]`, $('#form'));
      if (sel) sel.value = state[f.name] ?? f.default ?? '';
    }
  }
}

export function renderForm(config, state, engines, runCallback){
  const formEl = $('#form');
      formEl.innerHTML = `<h2>${config.title}</h2><p class="desc">${config.description}</p>` +
      config.inputs.map(f => fieldHTML(f, state[f.name])).join('') +
      `<div class="row mobile-row">
        <button class="btn" id="btnRun">Recalculate</button>
        <button class="btn secondary" id="btnCSV">Download CSV</button>
        <button class="btn secondary" id="btnShare">Copy Share Link</button>
      </div>`;

  formEl.addEventListener('click', (e)=>{
    const t = e.target;
    if (t.matches('[data-action="add-row"]')){
      const name = t.getAttribute('data-name');
      const f = config.inputs.find(x=>x.name===name);
      const container = document.getElementById(`rep_${name}`);
      const idx = container.children.length;
      const row = {};
      for (const col of f.of){ row[col.name] = col.default ?? '' }
      const div = document.createElement('div');
      div.className='debt'; 
      div.dataset.idx=String(idx);
      div.innerHTML = `<div class="debt-header"><strong>Item ${idx+1}</strong><span class="link" data-action="remove" data-idx="${idx}">Remove</span></div>
        <div class="row">${f.of.map(col=>`<div class="field"><label>${col.label}</label>${inputEl(col, row[col.name], `${name}.${idx}.${col.name}`)}</div>`).join('')}</div>`;
      container.appendChild(div);
    }
    if (t.matches('[data-action="remove"]')){
      const box = t.closest('.debt'); 
      box?.remove();
    }
  });

  // Bind actions
  $('#btnRun').addEventListener('click', ()=> runCallback(config));
  $('#btnCSV').addEventListener('click', ()=> downloadResults(config));
  $('#btnShare').addEventListener('click', ()=> shareResults(config));

  // Auto-run
  runCallback(config);
}

export function renderResults(config, results, calculators){
  const resultsEl = $('#results');
  const kpi = (n,l,fmt) => `<div class="item"><div class="label">${l}</div><div class="value">${fmt?fmt(n):n}</div></div>`;
  
  resultsEl.innerHTML = `<h2>Results</h2>
    <div class="kpi">${config.outputs.map(o=>{
      const v = results[o.name];
      const format = (o.format==='currency') 
        ? fmtCurrency 
        : (o.format==='number' ? (x)=>fmtNumber(x,0) 
        : (o.format==='percent' ? (x)=>x+'%' : (x)=>x));
      return kpi(v, o.label, format);
    }).join('')}</div>
    <p class="muted" style="margin-top:8px;">Tip: tweak one input at a time to see how your timeline changes.</p>`;

  // Chart (update in place to avoid reflow/resizer loops)
  const canvas = $('#chart');
  renderChart(canvas, config, results);

  // Explainer (fallback to local config if global registry is missing)
  const explainerText = (calculators && calculators[config.id] && calculators[config.id].explainer) 
    ? calculators[config.id].explainer 
    : (config.explainer || '');
  $('#explainer').textContent = explainerText;
  
  // Educational sections
  renderEducationalSections(config);
  
}

function renderChart(canvas, config, results) {
  // If Chart.js hasn't loaded yet, skip chart rendering to avoid breaking the page
  if (typeof window !== 'undefined' && typeof window.Chart === 'undefined') {
    console.warn('Chart.js not available yet; skipping chart render for now.');
    return;
  }
  const chartConfig = getChartConfig(config, results);
  
  // Add lazy loading - only render chart when it's visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Chart is visible, render it
        if (!chart) {
          // Register datalabels plugin for doughnut charts
          if (['budget-splitter', 'debt-to-income'].includes(config.id)) {
            Chart.register(ChartDataLabels);
          }
          chart = new Chart(canvas, chartConfig);
        } else {
          // Destroy and recreate for chart type changes
          chart.destroy();
          if (['budget-splitter', 'debt-to-income'].includes(config.id)) {
            Chart.register(ChartDataLabels);
          }
          chart = new Chart(canvas, chartConfig);
        }
        
        // Add loaded class for smooth fade-in
        canvas.classList.add('loaded');
        
        // Stop observing once chart is rendered
        observer.unobserve(canvas);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  // Start observing the chart area
  observer.observe(canvas);
}

function getChartConfig(config, results) {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { 
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            // Format based on calculator type
            if (['compound-interest', 'emergency-fund', 'savings-rate', 'goal-timeline', 'refinance-breakeven', 'extra-payment', 'credit-card-minimum'].includes(config.id)) {
              return `${label}: ${fmtCurrency(value)}`;
            } else if (['budget-splitter', 'debt-to-income'].includes(config.id)) {
              return `${label}: ${fmtCurrency(value)}`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: getXAxisLabel(config)
        },
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: getYAxisLabel(config)
        },
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return getYAxisFormat(config, value);
          }
        }
      }
    }
  };

  // Calculator-specific chart configurations
  switch(config.id) {
    case 'budget-splitter':
      return {
        type: 'doughnut',
        data: {
          labels: results.timeline.map(p => p.category),
          datasets: [{
            label: config.chart.series[0].label,
            data: results.timeline.map(p => p.amount),
            backgroundColor: [
              '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'
            ],
            borderColor: '#1f2a4a',
            borderWidth: 2
          }]
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            datalabels: {
              display: true,
              color: '#ffffff',
              font: {
                weight: 'bold',
                size: 12
              },
              formatter: (value, context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(0);
                return percentage + '%';
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${fmtCurrency(value)} (${percentage}%)`;
                }
              }
            }
          },
          scales: {} // Remove scales for doughnut chart
        }
      };

    case 'debt-to-income':
      // Separate debt payments from income
      const debtCategories = results.timeline.filter(p => p.amount > 0);
      const totalDebts = debtCategories.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        type: 'doughnut',
        data: {
          labels: debtCategories.map(p => p.category),
          datasets: [{
            label: 'Monthly Debt Payments',
            data: debtCategories.map(p => p.amount),
            backgroundColor: [
              '#f87171', '#fbbf24', '#fb7185', '#a78bfa', '#60a5fa', '#34d399'
            ],
            borderColor: '#1f2a4a',
            borderWidth: 3
          }]
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            datalabels: {
              display: true,
              color: '#ffffff',
              font: {
                weight: 'bold',
                size: 11
              },
              formatter: (value, context) => {
                if (value < totalDebts * 0.08) return ''; // Hide labels for small slices
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(0);
                return percentage + '%';
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${fmtCurrency(value)} (${percentage}% of total debt)`;
                }
              }
            },
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12
                }
              }
            }
          },
          scales: {} // Remove scales for doughnut chart
        }
      };

    case 'debt-payoff':
      return {
        type: 'line',
        data: {
          labels: results.timeline.map(p => `Month ${p.month}`),
          datasets: [{
            label: 'Total Debt Balance',
            data: results.timeline.map(p => p.totalBalance),
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 3,
            pointBackgroundColor: '#f87171',
            pointBorderColor: '#1f2a4a',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#f87171',
            pointHoverBorderWidth: 3
          }]
        },
        options: baseOptions
      };

    case 'refinance-breakeven':
      return {
        type: 'line',
        data: {
          labels: results.timeline.map(p => `Month ${p.month}`),
          datasets: [{
            label: 'Cumulative Savings',
            data: results.timeline.map(p => p.cumulativeSavings),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: 'origin',
            tension: 0.1,
            pointRadius: 3,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#1f2a4a',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#34d399',
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            annotation: {
              annotations: {
                line1: {
                  type: 'line',
                  yMin: 0,
                  yMax: 0,
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    content: 'Break-even point',
                    enabled: true
                  }
                }
              }
            }
          }
        }
      };

    case 'compound-interest':
    case 'savings-rate':
      // Add Year 0 starting point - use the initial values from inputs
      const startingBalance = config.id === 'compound-interest' ? 
        (results.finalBalance - results.totalGrowth - results.totalContrib) : // Starting principal
        results.timeline[0]?.portfolio - (results.monthlySavings * 12); // Current investments
      
      const timelineWithStart = [{
        [config.chart.x]: 0,
        [config.chart.series[0].key]: Math.max(0, startingBalance || 0)
      }, ...results.timeline];
      
      return {
        type: 'line',
        data: {
          labels: timelineWithStart.map(p => `Year ${p[config.chart.x]}`),
          datasets: [{
            label: config.chart.series[0].label,
            data: timelineWithStart.map(p => p[config.chart.series[0].key]),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 3,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#1f2a4a',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#60a5fa',
            pointHoverBorderWidth: 3
          }]
        },
        options: baseOptions
      };

    case 'goal-timeline':
    case 'emergency-fund':
      // Add Month 0 starting point - use input values
      const monthStartingValue = config.id === 'goal-timeline' ? 
        (results.timeline[0]?.balance - (results.totalContributions / results.timeline.length)) : // Start amount from inputs
        (results.targetAmount - results.stillNeeded); // Already saved amount
        
      const monthTimelineWithStart = [{
        [config.chart.x]: 0,
        [config.chart.series[0].key]: Math.max(0, monthStartingValue || 0)
      }, ...results.timeline];
      
      return {
        type: 'line',
        data: {
          labels: monthTimelineWithStart.map(p => `Month ${p[config.chart.x]}`),
          datasets: [{
            label: config.chart.series[0].label,
            data: monthTimelineWithStart.map(p => p[config.chart.series[0].key]),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 3,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#1f2a4a',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#34d399',
            pointHoverBorderWidth: 3
          }]
        },
        options: baseOptions
      };

    default:
      return {
        type: 'line',
        data: {
          labels: results.timeline.map(p => {
            const xValue = p[config.chart.x];
            if (config.chart.x === 'month') return `Month ${xValue}`;
            if (config.chart.x === 'year') return `Year ${xValue}`;
            return xValue;
          }),
          datasets: [{
            label: config.chart.series[0].label,
            data: results.timeline.map(p => p[config.chart.series[0].key]),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 3,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#1f2a4a',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#60a5fa',
            pointHoverBorderWidth: 3
          }]
        },
        options: baseOptions
      };
  }
}

function renderEducationalSections(config) {
  const educationalSections = $('#educationalSections');
  const howToGrid = $('#howToGrid');
  const mathContent = $('#mathContent');
  const mathToggle = $('#mathToggle');
  
  // Show educational sections
  educationalSections.style.display = 'block';
  
  // Get content for this calculator
  const content = getEducationalContent(config.id);
  
  // Render How to Use section with semantic markup for AI
  howToGrid.innerHTML = content.howTo.map((section, index) => `
    <div class="how-to-item" itemscope itemtype="https://schema.org/HowToStep">
      <h3 itemprop="name">${index + 1}. ${section.title}</h3>
      <p itemprop="text">${section.content}</p>
    </div>
  `).join('');
  
  // Render Math section
  mathContent.innerHTML = content.math;
  
  // Add structured data for current calculator
  addCalculatorStructuredData(config);
  
  // Add toggle functionality
  mathToggle.onclick = () => {
    const isOpen = mathContent.style.display !== 'none';
    mathContent.style.display = isOpen ? 'none' : 'block';
    const arrow = mathToggle.querySelector('.math-arrow');
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  };
}

function addCalculatorStructuredData(config) {
  // Remove existing calculator structured data
  const existingScript = document.getElementById('calculator-structured-data');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Create calculator-specific structured data
  const structuredData = getCalculatorStructuredData(config);
  const script = document.createElement('script');
  script.id = 'calculator-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData, null, 2);
  document.head.appendChild(script);
}

function getCalculatorStructuredData(config) {
  const baseStructure = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${config.title} - Finance Toolkit`,
    "description": config.explainer || '',
    "url": `https://openfinancecalculators.com/#${config.id}`,
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "@currency": "USD"
    },
    "author": {
      "@type": "Organization", 
      "name": "Finance Toolkit"
    }
  };
  
  // Add calculator-specific features and keywords
  switch(config.id) {
    case 'compound-interest':
      return {
        ...baseStructure,
        "keywords": "compound interest calculator, investment growth, time value of money, retirement planning",
        "featureList": ["Compound interest calculation", "Timeline visualization", "Monthly contribution tracking", "Growth projections"],
        "about": "Calculate compound interest growth over time with regular contributions"
      };
      
    case 'debt-payoff':
      return {
        ...baseStructure,
        "keywords": "debt payoff calculator, debt snowball, debt avalanche, credit card payoff",
        "featureList": ["Debt snowball method", "Debt avalanche method", "Extra payment scenarios", "Payoff timeline"],
        "about": "Compare debt payoff strategies and calculate payoff timelines"
      };
      
    case 'emergency-fund':
      return {
        ...baseStructure,
        "keywords": "emergency fund calculator, financial security, rainy day fund, emergency savings",
        "featureList": ["Emergency fund target calculation", "Savings timeline", "Monthly goal setting"],
        "about": "Calculate emergency fund targets and savings timelines"
      };
      
    case 'savings-rate':
      return {
        ...baseStructure,
        "keywords": "savings rate calculator, financial independence, FIRE calculator, retirement planning",
        "featureList": ["Savings rate calculation", "Financial independence timeline", "4% withdrawal rule", "FI projections"],
        "about": "Calculate savings rate and time to financial independence"
      };
      
    case 'budget-splitter':
      return {
        ...baseStructure,
        "keywords": "budget calculator, 50/30/20 rule, budget planning, money management",
        "featureList": ["50/30/20 budget rule", "Custom budget ratios", "Pay frequency adjustments"],
        "about": "Split income into needs, wants, and savings categories"
      };
      
    default:
      return baseStructure;
  }
}

function getEducationalContent(calculatorId) {
  const content = {
    'compound-interest': {
      howTo: [
        {
          title: "Starting Amount (Principal)",
          content: "Enter what you already have saved or will deposit at the start. If you’re starting from $0, leave this as 0."
        },
        {
          title: "Monthly Contribution",
          content: "How much you add each month. Automating this as a recurring transfer helps you stay consistent."
        },
        {
          title: "Expected Annual Return",
          content: "A conservative long‑term estimate is 6–7% for a diversified stock portfolio, 3–4% for bonds, and 1–2% for cash. Pick a rate that matches your risk mix."
        },
        {
          title: "Years & Compounding",
          content: "Choose a time horizon and compounding frequency (monthly is common). Longer horizons and higher compounding frequencies generally increase growth."
        },
        {
          title: "Tip: Think Real (After‑Inflation)",
          content: "For planning, consider subtracting ~2–3% from your return to estimate purchasing‑power growth after inflation."
        }
      ],
      math: `
        <h4>Compound Interest Formula</h4>
        <p><strong>A = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)]</strong></p>
        <ul>
          <li><strong>A</strong> = Final amount</li>
          <li><strong>P</strong> = Principal (starting amount)</li>
          <li><strong>PMT</strong> = Monthly payment</li>
          <li><strong>r</strong> = Annual interest rate (as decimal)</li>
          <li><strong>n</strong> = Number of times interest compounds per year (12 for monthly)</li>
          <li><strong>t</strong> = Number of years</li>
        </ul>
        <p><strong>Example:</strong> $1,000 starting + $100/month at 7% for 20 years</p>
        <p>A = $1,000(1.07)^20 + $100 × [((1.07)^20 - 1) / 0.07] = <strong>$52,397</strong></p>
      `
    },
    'debt-payoff': {
      howTo: [
        {
          title: "Add Each Debt Correctly",
          content: "For every loan/card, enter Balance, APR, and Minimum. Use the current statement numbers."
        },
        {
          title: "Pick a Strategy",
          content: "Snowball (smallest balance first) builds motivation. Avalanche (highest APR first) minimizes interest. Both work—choose what you’ll stick to."
        },
        {
          title: "Extra Payment",
          content: "Any extra goes to the current target debt. Even $25–$100/mo can remove years and thousands in interest."
        },
        {
          title: "Reality Check",
          content: "If cash flow varies, plan a lower guaranteed extra, then add one‑time lump sums (tax refunds/bonuses) when they arrive."
        },
        {
          title: "Don’t Forget Behavioral Wins",
          content: "If motivation is an issue, Snowball’s quick wins often beat a perfect plan you can’t follow."
        }
      ],
      math: `
        <h4>Debt Payoff Calculations</h4>
        <p><strong>Monthly Interest = Balance × (APR ÷ 12)</strong></p>
        <p><strong>Principal Payment = Total Payment - Monthly Interest</strong></p>
        <p><strong>New Balance = Previous Balance - Principal Payment</strong></p>
        <h4>Avalanche vs Snowball</h4>
        <ul>
          <li><strong>Avalanche:</strong> Sort by highest APR first</li>
          <li><strong>Snowball:</strong> Sort by smallest balance first</li>
          <li><strong>Extra Payment:</strong> Goes entirely to target debt</li>
        </ul>
        <p><strong>Example:</strong> $5,000 at 18% APR with $150/month payment</p>
        <p>Month 1: $75 interest + $75 principal = $4,925 remaining</p>
      `
    },
    'emergency-fund': {
      howTo: [
        {
          title: "Estimate True Essentials",
          content: "Include housing, utilities, food, insurance, transportation, and minimum debt payments. Exclude wants."
        },
        {
          title: "Pick a Buffer",
          content: "Stable dual income: 3 months. Single or variable income: 6 months. Self‑employed/high‑risk: 9–12 months."
        },
        {
          title: "Choose a Savings Plan",
          content: "Set a monthly auto‑transfer to a high‑yield savings account. Start small if needed—consistency matters most."
        },
        {
          title: "Use Milestones",
          content: "First $1,000 → 1 month → full target. Celebrate progress to stay motivated."
        }
      ],
      math: `
        <h4>Emergency Fund Formula</h4>
        <p><strong>Target Amount = Monthly Expenses × Buffer Months</strong></p>
        <p><strong>Months to Goal = Target Amount ÷ Monthly Savings</strong></p>
        <p><strong>With Interest: FV = PMT × [((1 + r)^n - 1) / r]</strong></p>
        <ul>
          <li><strong>FV</strong> = Future value</li>
          <li><strong>PMT</strong> = Monthly payment</li>
          <li><strong>r</strong> = Monthly interest rate</li>
          <li><strong>n</strong> = Number of months</li>
        </ul>
        <p><strong>Example:</strong> $3,000 expenses × 6 months = $18,000 target</p>
        <p>Saving $500/month = 36 months to fully funded emergency fund</p>
      `
    },
    'savings-rate': {
      howTo: [
        {
          title: "Net Income vs. Expenses",
          content: "Net Income = take‑home after taxes/benefits. Expenses = everything you pay monthly (be honest). Savings = Net Income − Expenses."
        },
        {
          title: "Current Investments",
          content: "Enter today’s portfolio value (brokerage + retirement). This anchors the FI timeline."
        },
        {
          title: "Return & Withdrawal Rate",
          content: "Use ~6% long‑term return as a conservative default. Withdrawal rate 4% is common; 3–3.5% is more conservative."
        },
        {
          title: "Levers to Pull",
          content: "Your FI time drops fastest by (1) increasing savings, (2) reducing expenses, (3) raising income."
        }
      ],
      math: `
        <h4>Savings Rate & FI Calculations</h4>
        <p><strong>Savings Rate = (Net Income - Expenses) ÷ Net Income × 100</strong></p>
        <p><strong>FI Number = Annual Expenses ÷ Withdrawal Rate</strong></p>
        <p><strong>Years to FI = ln(FI Number ÷ Current + 1) ÷ ln(1 + return rate)</strong></p>
        <h4>Common FI Rules</h4>
        <ul>
          <li><strong>4% Rule:</strong> Need 25x annual expenses</li>
          <li><strong>3% Rule:</strong> Need 33x annual expenses (more conservative)</li>
          <li><strong>5% Rule:</strong> Need 20x annual expenses (more aggressive)</li>
        </ul>
        <p><strong>Example:</strong> $4,000/month expenses = $48,000/year</p>
        <p>At 4% withdrawal: Need $1,200,000 for FI</p>
      `
    },
    'goal-timeline': {
      howTo: [
        {
          title: "Define the Goal",
          content: "Choose a clear amount and purpose (e.g., down payment, wedding, car). Specificity drives commitment."
        },
        {
          title: "Starting Amount",
          content: "Enter what you already have saved for this goal."
        },
        {
          title: "Monthly Contribution & Return",
          content: "Pick a realistic monthly savings and expected annual return (use low estimates for short timelines)."
        },
        {
          title: "Step‑Up Savings",
          content: "If you expect raises, enable step‑ups to increase contributions every X months."
        }
      ],
      math: `
        <h4>Future Value of Annuity Formula</h4>
        <p><strong>FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]</strong></p>
        <ul>
          <li><strong>FV</strong> = Future value (your goal)</li>
          <li><strong>PV</strong> = Present value (starting amount)</li>
          <li><strong>PMT</strong> = Monthly payment</li>
          <li><strong>r</strong> = Monthly interest rate</li>
          <li><strong>n</strong> = Number of months</li>
        </ul>
        <h4>Step-Up Savings</h4>
        <p>If enabled, contributions increase by step-up amount every step-up frequency period.</p>
        <p><strong>Example:</strong> $20,000 goal, $1,000 start, $200/month at 5% return</p>
        <p>Timeline: ~7.5 years with steady contributions</p>
      `
    },
    'refinance-breakeven': {
      howTo: [
        {
          title: "Current vs. New Loan",
          content: "Enter current balance, APR, remaining months. Then the new APR and term you’re considering."
        },
        {
          title: "Closing Costs",
          content: "Include all fees (origination, appraisal, title, points). These determine the break‑even time."
        },
        {
          title: "Interpret Results",
          content: "If break‑even months > how long you’ll keep the loan, refinancing may not be worth it."
        }
      ],
      math: `
        <h4>Monthly Payment Formula</h4>
        <p><strong>PMT = P × [r(1+r)^n] / [(1+r)^n - 1]</strong></p>
        <ul>
          <li><strong>PMT</strong> = Monthly payment</li>
          <li><strong>P</strong> = Principal balance</li>
          <li><strong>r</strong> = Monthly interest rate</li>
          <li><strong>n</strong> = Number of payments</li>
        </ul>
        <h4>Break-Even Analysis</h4>
        <p><strong>Monthly Savings = Old Payment - New Payment</strong></p>
        <p><strong>Break-Even Months = Closing Costs ÷ Monthly Savings</strong></p>
        <p><strong>Example:</strong> Save $200/month with $3,000 closing costs</p>
        <p>Break-even time: 15 months</p>
      `
    },
    'budget-splitter': {
      howTo: [
        {
          title: "Start with Take‑Home Pay",
          content: "Use after‑tax income (what lands in your bank). Include any regular side income."
        },
        {
          title: "Tune the Ratios",
          content: "50/30/20 is a guide. High COL areas may push Needs higher; aggressive savers push Savings higher."
        },
        {
          title: "Define Categories Clearly",
          content: "Needs: essentials and minimum debt payments. Wants: discretionary. Savings: emergency fund, investing, extra debt payoff."
        },
        {
          title: "Match Pay Frequency",
          content: "If paid weekly/biweekly, use the frequency field to see realistic monthly equivalents."
        }
      ],
      math: `
        <h4>Budget Allocation Formula</h4>
        <p><strong>Category Amount = Take-Home Pay × Category Percentage</strong></p>
        <h4>Popular Budget Rules</h4>
        <ul>
          <li><strong>50/30/20:</strong> 50% needs, 30% wants, 20% savings</li>
          <li><strong>70/20/10:</strong> 70% needs, 20% wants, 10% savings</li>
          <li><strong>80/20:</strong> 80% expenses, 20% savings (simplified)</li>
          <li><strong>60/40:</strong> 60% fixed expenses, 40% flexible (aggressive)</li>
        </ul>
        <h4>Pay Frequency Adjustments</h4>
        <p>Weekly: Monthly ÷ 4.33 | Bi-weekly: Monthly ÷ 2.17 | Semi-monthly: Monthly ÷ 2</p>
        <p><strong>Example:</strong> $5,000/month take-home with 50/30/20</p>
        <p>Needs: $2,500 | Wants: $1,500 | Savings: $1,000</p>
      `
    },
    'extra-payment': {
      howTo: [
        {
          title: "Loan Inputs",
          content: "Balance = today’s principal. APR = interest rate. Remaining Months = months left on current schedule."
        },
        {
          title: "Extra Type",
          content: "Monthly adds every month. Annual adds once per year. One‑time is a single lump sum."
        },
        {
          title: "Which to Choose?",
          content: "If APR > expected investment return, extra payments usually win. If APR is low, consider investing extras."
        }
      ],
      math: `
        <h4>Loan Payment Formula</h4>
        <p><strong>PMT = P × [r(1+r)^n] / [(1+r)^n - 1]</strong></p>
        <p><strong>Interest Payment = Current Balance × (APR ÷ 12)</strong></p>
        <p><strong>Principal Payment = Total Payment - Interest Payment</strong></p>
        <h4>Extra Payment Impact</h4>
        <ul>
          <li><strong>One-time:</strong> Reduces principal by full extra amount</li>
          <li><strong>Monthly:</strong> Extra amount applied to principal each payment</li>
          <li><strong>Annual:</strong> Large payment applied once per year</li>
        </ul>
        <p><strong>Example:</strong> $200,000 mortgage at 6% for 30 years</p>
        <p>Standard payment: $1,199/month | With $200 extra: saves ~7 years + $68,000 interest</p>
      `
    },
    'credit-card-minimum': {
      howTo: [
        {
          title: "Know Your Issuer’s Rule",
          content: "Common: 2–3% of balance or a fixed $25–35 (whichever is higher), or 1% + interest + fees."
        },
        {
          title: "Minimums Cost You",
          content: "Paying only minimums can take decades and cost thousands in interest. Use the output to see the true timeline."
        },
        {
          title: "Create a Personal Minimum",
          content: "Commit to a fixed amount 2–3× the required minimum or target a 24–36 month payoff."
        }
      ],
      math: `
        <h4>Credit Card Minimum Payment</h4>
        <p><strong>Option 1:</strong> Percentage of balance (usually 2-3%)</p>
        <p><strong>Option 2:</strong> Fixed amount ($25-35)</p>
        <p><strong>Actual Minimum = Higher of the two options</strong></p>
        <h4>Interest Calculation</h4>
        <p><strong>Monthly Interest = Balance × (APR ÷ 12)</strong></p>
        <p><strong>Principal Payment = Minimum Payment - Monthly Interest</strong></p>
        <p><strong>New Balance = Old Balance - Principal Payment</strong></p>
        <p><strong>Example:</strong> $5,000 balance at 20% APR with 2% minimum</p>
        <p>Month 1: $100 payment ($83 interest + $17 principal) = $4,983 remaining</p>
        <p>Total time: ~20 years | Total interest: ~$8,000</p>
      `
    },
    'debt-to-income': {
      howTo: [
        {
          title: "Gross Income",
          content: "Use pre‑tax monthly income (salary ÷ 12). Include regular side income if dependable."
        },
        {
          title: "Monthly Debts",
          content: "Include rent/mortgage, auto, student loans, credit card minimums, and other required payments."
        },
        {
          title: "Interpretation",
          content: "Front‑end (housing only) <28%. Back‑end (all debts) <36% is ideal. >43% is high‑risk for many lenders."
        }
      ],
      math: `
        <h4>Debt-to-Income Ratios</h4>
        <p><strong>Front-End DTI = Housing Payment ÷ Gross Income × 100</strong></p>
        <p><strong>Back-End DTI = Total Debt Payments ÷ Gross Income × 100</strong></p>
        <h4>Lender Guidelines</h4>
        <ul>
          <li><strong>Front-End DTI:</strong> ≤28% (housing only)</li>
          <li><strong>Back-End DTI:</strong> ≤36% (all debts)</li>
          <li><strong>High-Risk:</strong> >43% (may limit loan options)</li>
        </ul>
        <h4>Risk Levels</h4>
        <ul>
          <li><strong>Low Risk:</strong> <28% - Excellent borrowing position</li>
          <li><strong>Moderate Risk:</strong> 28-36% - Good borrowing position</li>
          <li><strong>High Risk:</strong> >36% - May need to reduce debt before borrowing</li>
        </ul>
        <p><strong>Example:</strong> $6,000 gross income, $1,500 housing, $500 other debts</p>
        <p>Front-end: 25% | Back-end: 33% (Good position)</p>
      `
    }
  };
  
  return content[calculatorId] || {
    howTo: [
      { title: "Enter Your Information", content: "Fill in the required fields with your financial information." },
      { title: "Review the Results", content: "Look at the calculations and timeline to understand the impact." },
      { title: "Adjust and Plan", content: "Try different scenarios to find the best strategy for your situation." }
    ],
    math: "<p>Mathematical formulas and detailed calculations for this calculator will be added soon.</p>"
  };
}

function getXAxisLabel(config) {
  switch(config.id) {
    case 'compound-interest':
    case 'savings-rate':
      return 'Years';
    case 'debt-payoff':
    case 'emergency-fund':
    case 'goal-timeline':
    case 'refinance-breakeven':
    case 'extra-payment':
    case 'credit-card-minimum':
      return 'Months';
    case 'budget-splitter':
    case 'debt-to-income':
      return 'Categories';
    default:
      return 'Time Period';
  }
}

function getYAxisLabel(config) {
  switch(config.id) {
    case 'compound-interest':
      return 'Account Balance ($)';
    case 'debt-payoff':
    case 'extra-payment':
    case 'credit-card-minimum':
      return 'Debt Balance ($)';
    case 'emergency-fund':
      return 'Emergency Fund ($)';
    case 'savings-rate':
      return 'Portfolio Value ($)';
    case 'goal-timeline':
      return 'Account Balance ($)';
    case 'refinance-breakeven':
      return 'Cumulative Savings ($)';
    case 'budget-splitter':
    case 'debt-to-income':
      return 'Monthly Amount ($)';
    default:
      return 'Amount ($)';
  }
}

function getYAxisFormat(config, value) {
  // Format Y-axis labels as currency for most calculators
  if (['budget-splitter', 'debt-to-income'].includes(config.id)) {
    return ''; // Doughnut charts don't need Y-axis
  }
  
  if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return '$' + (value / 1000).toFixed(0) + 'k';
  } else {
    return '$' + value.toFixed(0);
  }
}

function renderGuides(config) {
  // This function can be implemented later for the guides section
  // For now, it's a placeholder to prevent errors
}

function downloadResults(config){
  const results = window.__lastResults || {};
  const state = getFormState(config);
  let rows = [];
  
  // Add header information
  const timestamp = new Date().toLocaleString();
  const header = [
    [`Finance Toolkit - ${config.title}`],
    [`Generated: ${timestamp}`],
    [`Website: ${window.location.origin}`],
    [''],
    ['INPUTS:']
  ];
  
  // Add input parameters
  config.inputs.forEach(input => {
    const value = state[input.name];
    let displayValue = value;
    if (input.type === 'currency') {
      displayValue = fmtCurrency(value || 0);
    } else if (input.type === 'percent') {
      displayValue = `${value || 0}%`;
    }
    header.push([`${input.label}:`, displayValue]);
  });
  
  header.push(['']);
  header.push(['RESULTS:']);
  
  // Add output results
  config.outputs.forEach(output => {
    const value = results[output.name];
    let displayValue = value;
    if (output.format === 'currency') {
      displayValue = fmtCurrency(value || 0);
    } else if (output.format === 'percent') {
      displayValue = `${value || 0}%`;
    } else if (output.format === 'number') {
      displayValue = fmtNumber(value || 0);
    }
    header.push([`${output.label}:`, displayValue]);
  });
  
  header.push(['']);
  header.push(['TIMELINE DATA:']);
  
  // Calculator-specific timeline data
  if (config.id==='compound-interest'){
    rows = [
      ...header,
      ['Year', 'Balance', 'Annual Contribution', 'Cumulative Contributions', 'Growth'],
      ...results.timeline.map((p, i) => {
        const yearlyContrib = toNum(state.contrib) * 12;
        const cumulativeContrib = toNum(state.principal) + (yearlyContrib * p.year);
        const growth = p.balance - cumulativeContrib;
        return [p.year, fmtCurrency(p.balance), fmtCurrency(yearlyContrib), fmtCurrency(cumulativeContrib), fmtCurrency(growth)];
      })
    ];
  } else if (config.id==='debt-payoff'){
    rows = [
      ...header,
      ['Month', 'Total Balance', 'Interest Paid This Month', 'Principal Paid This Month'],
      ...results.timeline.map((p, i) => {
        const prevBalance = i > 0 ? results.timeline[i-1].totalBalance : results.timeline[0].totalBalance;
        const balanceReduction = prevBalance - p.totalBalance;
        return [p.month, fmtCurrency(p.totalBalance), '', fmtCurrency(balanceReduction)];
      })
    ];
  } else if (config.id==='emergency-fund'){
    rows = [
      ...header,
      ['Month', 'Emergency Fund Balance', 'Monthly Contribution', 'Interest Earned'],
      ...results.timeline.map(p => [p.month, fmtCurrency(p.emergencyBalance), fmtCurrency(toNum(state.monthlySavings)), ''])
    ];
  } else if (config.id==='savings-rate'){
    rows = [
      ...header,
      ['Year', 'Portfolio Value', 'Annual Contributions', 'Annual Growth'],
      ...results.timeline.map((p, i) => {
        const annualContrib = toNum(state.netIncome - state.monthlyExpenses) * 12;
        const prevValue = i > 0 ? results.timeline[i-1].portfolio : toNum(state.currentInvestments);
        const growth = p.portfolio - prevValue - annualContrib;
        return [p.year, fmtCurrency(p.portfolio), fmtCurrency(annualContrib), fmtCurrency(growth)];
      })
    ];
  } else if (config.id==='goal-timeline'){
    rows = [
      ...header,
      ['Month', 'Account Balance', 'Monthly Contribution', 'Cumulative Contributions'],
      ...results.timeline.map(p => {
        const cumulativeContrib = toNum(state.monthlyContribution) * p.month;
        return [p.month, fmtCurrency(p.balance), fmtCurrency(toNum(state.monthlyContribution)), fmtCurrency(cumulativeContrib)];
      })
    ];
  } else if (config.id==='refinance-breakeven'){
    rows = [
      ...header,
      ['Month', 'Cumulative Savings', 'Break-Even Status'],
      ...results.timeline.map(p => [
        p.month, 
        fmtCurrency(p.cumulativeSavings),
        p.cumulativeSavings >= 0 ? 'Profitable' : 'Not Yet'
      ])
    ];
  } else if (config.id==='budget-splitter'){
    const frequency = state.payFrequency || 'monthly';
    rows = [
      ...header,
      ['Category', 'Amount', 'Percentage', 'Annual Amount'],
      ...results.timeline.map(p => {
        const annualMultiplier = frequency === 'weekly' ? 52 : frequency === 'biweekly' ? 26 : 12;
        return [
          p.category, 
          fmtCurrency(p.amount), 
          `${state[p.category.toLowerCase() + 'Percent'] || 0}%`,
          fmtCurrency(p.amount * annualMultiplier)
        ];
      })
    ];
  } else if (config.id==='extra-payment'){
    rows = [
      ...header,
      ['Month', 'Remaining Balance', 'Regular Payment', 'Extra Payment', 'Total Payment'],
      ...results.timeline.map(p => [
        p.month, 
        fmtCurrency(p.balance),
        '',
        fmtCurrency(toNum(state.extraPayment)),
        ''
      ])
    ];
  } else if (config.id==='credit-card-minimum'){
    rows = [
      ...header,
      ['Month', 'Remaining Balance', 'Minimum Payment', 'Interest Charge'],
      ...results.timeline.map(p => [p.month, fmtCurrency(p.balance), '', ''])
    ];
  } else if (config.id==='debt-to-income'){
    rows = [
      ...header,
      ['Category', 'Monthly Payment', 'Percentage of Income'],
      ...results.timeline.map(p => [
        p.category, 
        fmtCurrency(p.amount),
        `${((p.amount / toNum(state.grossIncome)) * 100).toFixed(1)}%`
      ])
    ];
  }
  
  downloadCSV(`${config.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, rows);
}

function shareResults(config){
  const url = location.origin + location.pathname + location.hash;
  copy(url); 
  const tgt = document.getElementById('shareTarget');
  tgt.textContent = 'Link copied to clipboard ✔'; 
  setTimeout(()=>tgt.textContent='', 3000);
}
