#!/usr/bin/env node

/**
 * PDF Generator Script using Puppeteer
 *
 * This script takes an HTML file path and generates a PDF
 * Usage: node generate_pdf.js <input.html> <output.pdf>
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF(htmlPath, outputPath) {
    let browser;

    try {
        // Validate input
        if (!fs.existsSync(htmlPath)) {
            throw new Error(`HTML file not found: ${htmlPath}`);
        }

        // Read HTML content
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set content
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        // Generate PDF with landscape A4 format
        await page.pdf({
            path: outputPath,
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            },
            displayHeaderFooter: false,
            preferCSSPageSize: false
        });

        console.log(`PDF generated successfully: ${outputPath}`);

    } catch (error) {
        console.error('Error generating PDF:', error.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 2) {
    console.error('Usage: node generate_pdf.js <input.html> <output.pdf>');
    process.exit(1);
}

const [htmlPath, outputPath] = args;

generatePDF(htmlPath, outputPath)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
