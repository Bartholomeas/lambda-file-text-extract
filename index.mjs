import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as parsePdf from 'pdf-parse/lib/pdf-parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tesseractConfig = {
  lang: 'eng+pol',
  oem: 1,
  psm: 3,
};

/**
 * @typedef {Object} FileInput
 * @property {string} [fileBuffer] - Base64 encoded file content (for AWS Lambda)
 * @property {string} [filePath] - Local file path (for local testing)
 * @property {string} filename - Name of the file
 * @property {string} contentType - MIME type of the file
 */

/**
 * Lambda handler for OCR processing
 * @param {Object} event - The event object containing file data
 * @param {FileInput[]} event.files - Single file or array of files to process
 * @returns {Object} - Response with OCR results
 */
export const handler = async event => {
  console.time('processingFiles');
  try {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    if (!event?.files?.length)
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'No files have been passed to processing.',
          results: [],
        }),
      };

    let files = event.files;

    const operations = [];
    for (const file of files) {
      operations.push(processFile(file));
    }

    const results = await Promise.all(operations);

    console.timeEnd('processingFiles');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Text extraction completed',
        results: results,
      }),
    };
  } catch (err) {
    console.error('Error processing files:', err);
    console.timeEnd('processingFiles');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Error processing files',
        error: err.message,
      }),
    };
  }
};

/**
 * Process a single file for OCR
 * @param {FileInput} fileInput - File input data
 * @returns {Object} - Result of the file processing
 */
async function processFile(fileInput) {
  try {
    let fileBuffer;

    // Support both fileBuffer (for AWS Lambda) and filePath (for local testing)
    if (fileInput.fileBuffer) {
      fileBuffer = Buffer.from(fileInput.fileBuffer, 'base64');
    } else if (fileInput.filePath) {
      // Just for local development
      fileBuffer = fs.readFileSync(fileInput.filePath);
    } else {
      throw new Error('Missing required field: fileBuffer or filePath');
    }

    const filename = fileInput.filename || 'document';
    const contentType = fileInput.contentType || determineMimeType(fileBuffer);

    let extractedText = '';

    if (contentType.includes('image') || isImageFile(fileBuffer)) {
      console.log(`Processing image file with OCR: ${filename}`);
      extractedText = await performOcrOnImage(fileBuffer, filename);
    } else if (contentType.includes('pdf') || isPdf(fileBuffer)) {
      console.log(`Processing PDF file with OCR: ${filename}`);
      extractedText = await performOcrOnPdf(fileBuffer, filename);
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    return {
      filename,
      success: true,
      extractedText,
    };
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    return {
      filename: fileInput.filename || 'unknown',
      success: false,
      error: error.message,
      extractedText: null,
    };
  }
}

async function performOcrOnImage(imageBuffer, filename) {
  try {
    // Process image with sharp for better OCR results
    const processedImageBuffer = await sharp(imageBuffer).greyscale().normalize().toBuffer();

    // Create a unique identifier for the file
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');

    // Create a temporary file for the image with a unique name
    const tempFilePath = path.join(__dirname, `temp_${timestamp}_${randomId}_${safeFilename}.jpg`);

    await fs.promises.writeFile(tempFilePath, processedImageBuffer);

    try {
      // Use Tesseract.js for OCR
      const { data } = await Tesseract.recognize(tempFilePath, 'eng+pol');

      // Save OCR results to a file as well
      const resultsDir = path.join(__dirname, 'results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      const resultsPath = path.join(resultsDir, `ocr_text_${timestamp}_${randomId}_${safeFilename}.txt`);
      fs.writeFileSync(resultsPath, data.text || '');

      return data.text;
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    }
  } catch (error) {
    throw error;
  }
}

async function performOcrOnPdf(pdfBuffer, filename) {
  try {
    const data = await parsePdf.default(pdfBuffer);
    const extractedText = data?.text;

    const timestamp = Date.now();
    const randomId = crypto.randomUUID();

    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const tempFilePath = path.join(resultsDir, `pdf_text_${timestamp}_${randomId}.txt`);
    fs.writeFileSync(tempFilePath, extractedText || '');

    return extractedText;
  } catch (error) {
    throw error;
  }
}

function determineMimeType(buffer) {
  if (isPdf(buffer)) {
    return 'application/pdf';
  } else if (isJpeg(buffer)) {
    return 'image/jpeg';
  } else if (isPng(buffer)) {
    return 'image/png';
  }
  return 'application/octet-stream';
}

function isPdf(buffer) {
  return buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF';
}

function isJpeg(buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer) {
  return (
    buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  );
}

function isImageFile(buffer) {
  return isJpeg(buffer) || isPng(buffer);
}
