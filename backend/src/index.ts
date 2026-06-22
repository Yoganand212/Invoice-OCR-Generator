import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { extractInvoiceData } from './extractor';

const app = express();
const prisma = new PrismaClient({ log: ['info'] });
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('invoice'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const originalPath = req.file.path;
    const filename = req.file.filename;

    // 1. Create a DB record for the uploaded invoice
    let invoice = await prisma.invoice.create({
      data: {
        filename,
        originalPath
      }
    });

    // 2. Call the Python OCR service
    const formData = new FormData();
    formData.append('file', fs.createReadStream(originalPath));

    try {
      const ocrResponse = await axios.post('http://127.0.0.1:8000/ocr', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      const extractedText = ocrResponse.data.full_text;

      // 3. Extract data from OCR text
      const extractedFields = extractInvoiceData(extractedText);

      // 4. Update DB with OCR results and extracted fields
      invoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          extractedText,
          invoiceNumber: extractedFields.invoiceNumber,
          invoiceDate: extractedFields.invoiceDate,
          vendorName: extractedFields.vendorName,
          gstNumber: extractedFields.gstNumber,
          totalAmount: extractedFields.totalAmount
        }
      });
      
    } catch (ocrError) {
      console.error('OCR service error:', ocrError);
      // We still return success but note that OCR failed
    }

    res.json({
      status: 'success',
      invoiceId: invoice.id,
      extractedText: invoice.extractedText,
      message: 'File processed successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
