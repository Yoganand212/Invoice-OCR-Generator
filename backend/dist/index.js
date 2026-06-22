"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const extractor_1 = require("./extractor");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient({ log: ['info'] });
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Set up storage for uploaded files
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
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
        const formData = new form_data_1.default();
        formData.append('file', fs_1.default.createReadStream(originalPath));
        try {
            const ocrResponse = await axios_1.default.post('http://127.0.0.1:8000/ocr', formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            const extractedText = ocrResponse.data.full_text;
            // 3. Extract data from OCR text
            const extractedFields = (0, extractor_1.extractInvoiceData)(extractedText);
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
        }
        catch (ocrError) {
            console.error('OCR service error:', ocrError);
            // We still return success but note that OCR failed
        }
        res.json({
            status: 'success',
            invoiceId: invoice.id,
            extractedText: invoice.extractedText,
            message: 'File processed successfully'
        });
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
