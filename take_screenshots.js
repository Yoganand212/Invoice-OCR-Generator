const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1000 });

  // Navigate to upload interface
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Inject a mock success state into the DOM
  await page.evaluate(() => {
    const main = document.querySelector('main');
    
    // Add success status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'mt-4 p-4 rounded-lg font-medium text-center bg-green-100 text-green-800';
    statusDiv.textContent = 'Success!';
    document.querySelector('section').appendChild(statusDiv);

    // Add Extracted Results section
    const resultsHtml = `
      <section class="bg-white rounded-xl shadow-md p-8 mb-8 border border-green-100 ring-2 ring-green-50" id="extracted-results">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span class="bg-green-100 text-green-600 p-2 rounded-lg mr-3">✨</span> 
          Extracted Results
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p class="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Vendor Name</p>
            <p class="text-lg text-gray-900 font-medium">Tech Corp Industries</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p class="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Invoice Number</p>
            <p class="text-lg text-gray-900 font-medium">INV-001</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p class="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Date</p>
            <p class="text-lg text-gray-900 font-medium">01-05-2026</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p class="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Amount</p>
            <p class="text-lg text-blue-600 font-bold">12000.00</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 md:col-span-2">
            <p class="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">GST Number</p>
            <p class="text-lg text-gray-900 font-medium">29ABCDE1234F1Z5</p>
          </div>
        </div>
        
        <div class="mt-6">
          <details class="group" id="ocr-details">
            <summary class="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-800 list-none flex items-center">
              <svg class="w-4 h-4 mr-1 transform transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              Show Raw OCR Text
            </summary>
            <div class="mt-3 bg-gray-900 text-gray-300 p-4 rounded-lg text-sm font-mono overflow-auto max-h-60">Tech Corp Industries
Invoice No: INV-001
Date: 01-05-2026
GSTIN: 29ABCDE1234F1Z5

Item 1 ... 5000.00
Item 2 ... 7000.00

Total Amount: 12000.00</div>
          </details>
        </div>
      </section>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = resultsHtml;
    main.insertBefore(tempDiv.firstElementChild, main.children[2]); // Insert before history
    
    // Add row to history
    const tbody = document.querySelector('tbody');
    if(tbody) {
       tbody.innerHTML = `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
          <td class="py-4 px-4 text-sm text-gray-500 max-w-[150px] truncate">sample_invoice.pdf</td>
          <td class="py-4 px-4 font-medium text-gray-900">Tech Corp Industries</td>
          <td class="py-4 px-4 text-gray-700">INV-001</td>
          <td class="py-4 px-4 text-gray-700">01-05-2026</td>
          <td class="py-4 px-4 font-semibold text-gray-900 text-right">12000.00</td>
        </tr>
       `;
    }
  });

  // Wait for a tiny bit for render
  await new Promise(r => setTimeout(r, 500));

  // Take Dashboard Screenshot
  await page.screenshot({ path: 'images/dashboard.png' });

  // Open the raw OCR details and take OCR output screenshot
  await page.click('summary');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'images/ocr_output.png' });

  await browser.close();
})();
