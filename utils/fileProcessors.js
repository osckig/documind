const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { createWorker } = require('tesseract.js');

/**
 * Process PDF files
 */
async function processPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return {
        text: data.text,
        metadata: {
            pages: data.numpages,
            info: data.info
        }
    };
}

/**
 * Process DOCX files
 */
async function processDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
        text: result.value,
        metadata: {
            messages: result.messages
        }
    };
}

/**
 * Process CSV files
 */
function processCSV(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Convert to text format
    const headers = Object.keys(jsonData[0] || {});
    let text = headers.join(', ') + '\n\n';

    jsonData.forEach(row => {
        const values = headers.map(h => row[h]);
        text += values.join(', ') + '\n';
    });

    return {
        text,
        metadata: {
            rows: jsonData.length,
            columns: headers.length,
            headers
        }
    };
}

/**
 * Process Excel files (.xlsx, .xls)
 */
function processExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    let allText = '';
    const sheetsData = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        allText += `\n\n=== Sheet: ${sheetName} ===\n\n`;

        if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            allText += headers.join(', ') + '\n';

            jsonData.forEach(row => {
                const values = headers.map(h => row[h]);
                allText += values.join(', ') + '\n';
            });

            sheetsData.push({
                name: sheetName,
                rows: jsonData.length,
                columns: headers.length
            });
        }
    });

    return {
        text: allText.trim(),
        metadata: {
            sheets: workbook.SheetNames.length,
            sheetsData
        }
    };
}

/**
 * Process images with OCR
 */
async function processImage(filePath) {
    const worker = await createWorker('eng');

    try {
        const { data: { text, confidence } } = await worker.recognize(filePath);

        await worker.terminate();

        return {
            text,
            metadata: {
                confidence: Math.round(confidence),
                ocrProcessed: true
            }
        };
    } catch (error) {
        await worker.terminate();
        throw error;
    }
}

/**
 * Process text files
 */
function processText(filePath) {
    const text = fs.readFileSync(filePath, 'utf-8');
    return {
        text,
        metadata: {
            encoding: 'utf-8'
        }
    };
}

/**
 * Main document processor that routes to appropriate handler
 */
async function processDocument(filePath, fileName, fileType) {
    let result;

    try {
        const ext = fileType.toLowerCase();

        switch (ext) {
            case '.pdf':
                result = await processPDF(filePath);
                break;

            case '.docx':
                result = await processDOCX(filePath);
                break;

            case '.csv':
                result = processCSV(filePath);
                break;

            case '.xlsx':
            case '.xls':
                result = processExcel(filePath);
                break;

            case '.png':
            case '.jpg':
            case '.jpeg':
                result = await processImage(filePath);
                break;

            case '.txt':
            case '.md':
            default:
                result = processText(filePath);
                break;
        }

        // Add file info to metadata
        result.metadata = {
            ...result.metadata,
            fileName,
            fileType: ext,
            fileSize: fs.statSync(filePath).size,
            processedAt: new Date().toISOString()
        };

        return result;

    } catch (error) {
        throw new Error(`Failed to process ${fileType} file: ${error.message}`);
    }
}

module.exports = {
    processDocument,
    processPDF,
    processDOCX,
    processCSV,
    processExcel,
    processImage,
    processText
};
