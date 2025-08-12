// Injects the shared header into the page
export async function injectHeader() {
  try {
    const res = await fetch('/partials/header.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load header');
    const html = await res.text();
    const placeholder = document.querySelector('[data-shared-header]');
    if (!placeholder) return;
    placeholder.outerHTML = html;
  } catch (e) {
    console.error('Header injection failed:', e);
  }
}

// Auto-run when imported as a module late in body
const headerReady = injectHeader();
window.__headerReady = headerReady;

// Inject Google Analytics (gtag) globally
function injectGoogleAnalytics(measurementId = 'G-H367BM53DS') {
  if (!measurementId) return;
  if (window.gtag || document.getElementById('ga-gtag-script')) return; // avoid duplicate

  // Load gtag script
  const gaScript = document.createElement('script');
  gaScript.id = 'ga-gtag-script';
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(gaScript);

  // Init gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(){
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
}

headerReady.finally(() => injectGoogleAnalytics('G-H367BM53DS'));


