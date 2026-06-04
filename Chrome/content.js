// Domain Price Unwithholder
// @version 1.0
// @author HenryZxTan
// @homepage https://github.com/HenryZxTan/Domain-Price-Unwithholder
// @license MIT
// Copyright (c) 2026 Henry Tan
// Free to use, modify, and distribute with attribution.

// 1. Helper function to scan scripts for a specific JSON key using regex
function extractPriceFromSource(key) {
  const scripts = document.querySelectorAll('script');
  for (let script of scripts) {
    if (script.textContent && script.textContent.includes(key)) {
      try {
        const regex = new RegExp(`"${key}"\\s*:\\s*(\\d+)`);
        const match = script.textContent.match(regex);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      } catch (e) {
        console.error(`Error parsing script tag for ${key}:`, e);
      }
    }
  }
  return null;
}

// 2. Format numbers into clean Australian Currency ($X,XXX,XXX)
function formatCurrency(num) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(num);
}

// 3. Main function to inspect source and inject the interactive marker
function injectPriceMarker() {
  const priceElement = document.querySelector('[data-testid="listing-details__listing-summary-title-name"]');

  // Verify the element exists and actually contains the 'Withheld' text
  if (!priceElement || !priceElement.textContent.includes('Withheld')) return;
  
  // Prevent duplicate injections
  if (priceElement.querySelector('.price-unwithholder-marker')) return;

  const exactPrice = extractPriceFromSource('exactPrice');
  const exactPriceV2 = extractPriceFromSource('exactPriceV2');

  // If absolutely nothing is hidden in the source, add a dead marker
  if (!exactPrice && !exactPriceV2) {
    const deadMarker = document.createElement('span');
    deadMarker.className = 'price-unwithholder-marker';
    deadMarker.innerText = ' 🔍❌';
    deadMarker.style.opacity = '0.3';
    deadMarker.style.cursor = 'not-allowed';
    deadMarker.title = 'No hidden price data found in page source.';
    priceElement.appendChild(deadMarker);
    return;
  }

  let tooltipPieces = [];
  if (exactPrice) tooltipPieces.push(`✅ Sold Price: ${formatCurrency(exactPrice)}`);
  if (exactPriceV2) tooltipPieces.push(`📋 Last Agent Guide: ${formatCurrency(exactPriceV2)}`);
  tooltipPieces.push("\nClick to reveal and replace text!");

  const marker = document.createElement('span');
  marker.className = 'price-unwithholder-marker';
  marker.innerText = ' 🔍';
  marker.style.cursor = 'pointer';
  marker.style.marginLeft = '8px';
  marker.style.fontSize = '1.1rem';
  marker.title = tooltipPieces.join("\n");

  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    
    let replacementText = "SOLD - ";
    if (exactPrice) {
      replacementText += formatCurrency(exactPrice);
    } else {
      replacementText += "Price Unknown";
    }

    if (exactPriceV2) {
      replacementText += ` (Guide: ${formatCurrency(exactPriceV2)})`;
    }

    priceElement.innerText = replacementText;
  });

  priceElement.appendChild(marker);
}

// 4. The Magic Trick: Watch the URL. If it switches from search to a listing, force a reload. 
// This is the simplest fix needed to get the Price Unwithholder to work in the current tab (and not require a refresh input from user)
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    const oldUrl = lastUrl;
    lastUrl = location.href;

    // If we just navigated from a search/listings page into a specific property page, slam the refresh button.
    if (oldUrl.includes('/sold-listings') && !location.href.includes('/sold-listings')) {
      window.location.reload();
      return; 
    }
  }
  
  // Otherwise, if we are on a standard page load or refresh, just inject the tool normally
  const priceElement = document.querySelector('[data-testid="listing-details__listing-summary-title-name"]');
  if (priceElement && priceElement.textContent.includes('Withheld') && !priceElement.querySelector('.price-unwithholder-marker')) {
    injectPriceMarker();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run immediately on standard page initialization
injectPriceMarker();
