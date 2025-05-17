# Lambda PDF Processing

A serverless AWS Lambda function that extracts text from invoices and other documents in PDF and image formats using OCR technology. This solution is optimized for Polish and English text.

## Features

- Image OCR using Tesseract.js 2.1.1 with Polish and English language support
- PDF OCR using PDF.js and Tesseract.js
- Support for JPEG, PNG, and other image formats
- Automatic file type detection
- Multiple invocation methods:
  - S3 event-based triggering
  - Direct file upload in the request body
  - Direct file buffer in the event payload

## Setup & Deployment

### Prerequisites

- Node.js 16+ (tested with Node.js 22.14.0)
- AWS CLI configured with appropriate permissions (for AWS deployment)
- An AWS account with access to Lambda and S3 services (for AWS deployment)

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
node run.mjs test_faktura2.jpg

# Test with a PDF (requires Canvas support)
node run.mjs invoice.pdf
```

Note: PDF processing requires the `canvas` package which may be challenging to install on some systems. The implementation provides graceful fallbacks if the required dependencies are missing.

### Troubleshooting Canvas Installation

If you're having trouble with the Canvas installation, try:

```bash
# Mac
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

Then reinstall dependencies:

```bash
npm ci
```

## AWS Configuration

1. Create an S3 bucket for your invoice files:

   ```
   aws s3 mb s3://your-invoice-bucket
   ```

2. Create the Lambda function:

   ```
   aws lambda create-function \
     --function-name pdf-text-extractor \
     --runtime nodejs16.x \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --role arn:aws:iam::your-account-id:role/lambda-s3-role \
     --timeout 60 \
     --memory-size 2048
   ```

   Note: OCR processing is resource-intensive, so we recommend at least 2GB of memory and a longer timeout.

3. Set up the S3 trigger:

   ```
   aws lambda add-permission \
     --function-name pdf-text-extractor \
     --statement-id s3-trigger \
     --action lambda:InvokeFunction \
     --principal s3.amazonaws.com \
     --source-arn arn:aws:s3:::your-invoice-bucket
   ```

4. Configure S3 to trigger the Lambda function when files are uploaded:
   ```
   aws s3api put-bucket-notification-configuration \
     --bucket your-invoice-bucket \
     --notification-configuration '{
         "LambdaFunctionConfigurations": [
           {
             "LambdaFunctionArn": "arn:aws:lambda:region:account-id:function:pdf-text-extractor",
             "Events": ["s3:ObjectCreated:*"]
           }
         ]
       }'
   ```

### IAM Permissions

Create an IAM role with these policies:

- AWSLambdaBasicExecutionRole
- AmazonS3ReadOnlyAccess

## Usage

### Method 1: S3 Upload Trigger

1. Upload a PDF or image file to your S3 bucket:

   ```
   aws s3 cp invoice.pdf s3://your-invoice-bucket/
   ```

2. The Lambda function will be triggered automatically and extract the text using OCR.

### Method 2: Direct API Gateway Invocation

You can set up an API Gateway endpoint and POST files directly:

```
POST https://your-api-gateway-url/prod/extract

Content-Type: application/pdf
Content-Length: 123456

[PDF binary content]
```

The API Gateway should be configured with binary media types support for PDF and images.

### Method 3: Direct Lambda Invocation

You can directly invoke the Lambda function with a Base64-encoded file:

```javascript
const AWS = require('aws-sdk');
const fs = require('fs');
const lambda = new AWS.Lambda();

// Read the file and convert to Base64
const fileBuffer = fs.readFileSync('invoice.pdf');
const base64File = fileBuffer.toString('base64');

// Invoke Lambda
lambda.invoke(
  {
    FunctionName: 'pdf-text-extractor',
    Payload: JSON.stringify({
      fileBuffer: base64File,
      contentType: 'application/pdf',
      filename: 'invoice.pdf',
    }),
  },
  (err, data) => {
    if (err) console.error(err);
    else console.log(JSON.parse(data.Payload));
  }
);
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

## Limitations

- Maximum file size: 10MB (Lambda payload limit)
- Processing time: Lambda timeout (default is 60 seconds, which should be enough for most documents)
- Memory usage: OCR is resource-intensive; increase memory allocation for faster processing
- For large files or many pages, consider using step functions or breaking files into smaller chunks
- PDF processing in local environment may be challenging due to Canvas dependencies

## License

ISC
