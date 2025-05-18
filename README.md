# Lambda PDF Processing

A serverless AWS Lambda function that extracts text from invoices and other documents in PDF and image formats using OCR technology. This solution is optimized for Polish and English text.

## Features

- Image OCR using Tesseract.js 6.0.1 with Polish and English language support
- PDF OCR using PDF.js and Tesseract.js
- Support for JPEG, PNG, and other image formats
- Automatic file type detection

## Prerequisites

- Node.js 18+ (tested with Node.js 22.14.0)

### Installation

1. Clone this repository:

   ```
   git clone [repository-url]
   cd lambda-pdf-processing
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Package the function for AWS deployment:
   ```
   npm run zip
   ```
   This creates a `function.zip` file with all the necessary code and dependencies.

## Local Testing

You can test the function locally using the provided run script:

```bash
# Test with an image
node run.mjs invoice.jpg

# Test with a PDF (requires Canvas support)
node run.mjs invoice2.pdf
```


## How It Works

- **For PDF files**: The function converts each page of the PDF to an image and performs OCR on each page using Tesseract.js.
- **For image files**: The function preprocesses the image to improve OCR quality and uses Tesseract.js directly.

## Language Support

This function is optimized for:

- Polish
- English

To support additional languages, modify the language parameter in the `Tesseract.recognize` calls:

```javascript
const { data } = await Tesseract.recognize(processedImageBuffer, 'eng+pol+deu+fra'); // Add German and French
```
