'use client';

import { useState, useEffect } from 'react';

type Invoice = {
  id: string;
  filename: string;
  extractedText?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  vendorName?: string;
  gstNumber?: string;
  totalAmount?: string;
  createdAt: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/invoices');
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setStatus('Uploading and running OCR...');
    setCurrentInvoice(null);

    const formData = new FormData();
    formData.append('invoice', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success!`);
        fetchInvoices(); // Refresh list
        
        // Fetch the specific uploaded invoice details
        const invRes = await fetch('http://localhost:3001/api/invoices');
        const invs = await invRes.json();
        const newest = invs.find((inv: any) => inv.id === data.invoiceId);
        if (newest) setCurrentInvoice(newest);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('Network error occurred during upload.');
    } finally {
      setIsUploading(false);
      setFile(null); // Reset file
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <main className="max-w-4xl w-full">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">AI Invoice Extractor</h1>
        
        {/* Upload Section */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload New Invoice</h2>
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50/30 mb-6 transition-all hover:bg-blue-50/50">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-6
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 file:transition-colors file:cursor-pointer
                cursor-pointer"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`w-full py-3 px-4 rounded-lg text-white font-bold transition-all shadow-sm
              ${!file || isUploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}`}
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing AI Model (Might take a moment)
              </span>
            ) : 'Upload & Extract Data'}
          </button>

          {status && (
            <div className={`mt-4 p-4 rounded-lg font-medium text-center ${status.includes('Success') ? 'bg-green-100 text-green-800' : status.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
              {status}
            </div>
          )}
        </section>

        {/* Current Upload Result */}
        {currentInvoice && (
          <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-green-100 ring-2 ring-green-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-green-100 text-green-600 p-2 rounded-lg mr-3">✨</span> 
              Extracted Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Vendor Name</p>
                <p className="text-lg text-gray-900 font-medium">{currentInvoice.vendorName || <span className="text-gray-400 italic">Not found</span>}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Invoice Number</p>
                <p className="text-lg text-gray-900 font-medium">{currentInvoice.invoiceNumber || <span className="text-gray-400 italic">Not found</span>}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Date</p>
                <p className="text-lg text-gray-900 font-medium">{currentInvoice.invoiceDate || <span className="text-gray-400 italic">Not found</span>}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Amount</p>
                <p className="text-lg text-blue-600 font-bold">{currentInvoice.totalAmount || <span className="text-gray-400 italic font-medium">Not found</span>}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 md:col-span-2">
                <p className="text-sm text-gray-500 font-semibold mb-1 uppercase tracking-wider">GST Number</p>
                <p className="text-lg text-gray-900 font-medium">{currentInvoice.gstNumber || <span className="text-gray-400 italic">Not found</span>}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <details className="group">
                <summary className="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-800 list-none flex items-center">
                  <svg className="w-4 h-4 mr-1 transform transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  Show Raw OCR Text
                </summary>
                <div className="mt-3 bg-gray-900 text-gray-300 p-4 rounded-lg text-sm font-mono overflow-auto max-h-60">
                  {currentInvoice.extractedText || "No text extracted"}
                </div>
              </details>
            </div>
          </section>
        )}

        {/* History Section */}
        <section className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice History</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-500 italic text-center py-8">No invoices processed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="pb-3 pt-4 px-4 font-semibold text-gray-600">File</th>
                    <th className="pb-3 pt-4 px-4 font-semibold text-gray-600">Vendor</th>
                    <th className="pb-3 pt-4 px-4 font-semibold text-gray-600">Inv No.</th>
                    <th className="pb-3 pt-4 px-4 font-semibold text-gray-600">Date</th>
                    <th className="pb-3 pt-4 px-4 font-semibold text-gray-600 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm text-gray-500 max-w-[150px] truncate" title={inv.filename}>{inv.filename}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{inv.vendorName || '-'}</td>
                      <td className="py-4 px-4 text-gray-700">{inv.invoiceNumber || '-'}</td>
                      <td className="py-4 px-4 text-gray-700">{inv.invoiceDate || '-'}</td>
                      <td className="py-4 px-4 font-semibold text-gray-900 text-right">{inv.totalAmount || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
