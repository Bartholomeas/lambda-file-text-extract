import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Create the test directory and file structure to satisfy pdf-parse's initialization
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'test', 'data');
const testFile = path.join(testDir, '05-versions-space.pdf');

// Ensure the test directory exists
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create an empty test file if it doesn't exist
if (!fs.existsSync(testFile)) {
  fs.writeFileSync(
    testFile,
    '%PDF-1.3\n%µµµµ\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Resources<<>>/Contents 4 0 R/Parent 2 0 R>>\nendobj\n4 0 obj\n<</Length 10>>stream\nHello Test\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n273\n%%EOF\n'
  );
}

// Import pdf-parse after the test file is created
import pdfParse from 'pdf-parse';

// Export a wrapper function that behaves the same way as pdf-parse
export default function parsePdf(pdfBuffer, options) {
  return pdfParse(pdfBuffer, options);
}
