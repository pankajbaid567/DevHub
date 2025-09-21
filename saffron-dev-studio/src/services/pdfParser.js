import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker script from a CDN. This is crucial for it to work in a browser environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

/**
 * Parses a PDF file and extracts its text content.
 * @param file The PDF file to parse.
 * @returns A promise that resolves with the extracted text.
 */
export async function parsePdf(file) {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read file."));
      }

      try {
        const typedArray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
          fullText += pageText + '\n\n'; // Add space between pages for better readability
        }

        resolve(fullText.trim());
      } catch (error) {
        console.error("Error parsing PDF:", error);
        reject(new Error("Could not parse the PDF file. It might be corrupted or in an unsupported format."));
      }
    };

    reader.onerror = () => {
      reject(new Error("An error occurred while reading the file."));
    };

    reader.readAsArrayBuffer(file);
  });
}

class PDFParser {
  async extractTextFromPDF(file) {
    if (!file || file.type !== 'application/pdf') {
      throw new Error('Invalid file type. Please upload a PDF file.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Please upload a file smaller than 5MB.');
    }

    try {
      const text = await parsePdf(file);
      
      if (text.trim().length < 100) {
        throw new Error('Unable to extract sufficient text from PDF. The file might be image-based or corrupted.');
      }

      return {
        text: text,
        numPages: await this.getPageCount(file),
        fileSize: file.size,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file. Please ensure the file is not corrupted.');
      } else if (error.message.includes('Password')) {
        throw new Error('Password-protected PDFs are not supported. Please upload an unprotected file.');
      } else if (error.message.includes('worker') || error.message.includes('fetch') || error.message.includes('CORS')) {
        throw new Error('PDF processing is temporarily unavailable. Please try again or upload a different PDF file.');
      } else if (error.message.includes('Setting up fake worker')) {
        throw new Error('PDF processing service is unavailable. Please try again or contact support if the issue persists.');
      } else {
        throw new Error(`Failed to parse PDF: ${error.message}`);
      }
    }
  }

  async getPageCount(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          resolve(pdf.numPages);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file for page count."));
      reader.readAsArrayBuffer(file);
    });
  }

  cleanExtractedText(text) {
    // Remove excessive whitespace and normalize line breaks
    let cleaned = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple line breaks with single line break
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from start and end of lines
      .trim();

    // Common PDF extraction artifacts to remove
    const artifacts = [
      /Page \d+ of \d+/gi,
      /\d+\/\d+\/\d+/g, // Dates in extraction artifacts
      /\f/g, // Form feed characters
      /\u0000/g, // Null characters
    ];

    artifacts.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    return cleaned;
  }

  async extractTextFromFile(file) {
    try {
      const result = await this.extractTextFromPDF(file);
      
      // Clean the extracted text
      const cleanedText = this.cleanExtractedText(result.text);
      
      return {
        text: cleanedText,
        numPages: result.numPages,
        fileSize: result.fileSize,
        extractedAt: result.extractedAt
      };
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error(`Failed to parse PDF: ${error.message}. Please ensure it's a valid, non-scanned, non-password-protected PDF.`);
    }
  }

  // Extract basic resume sections for better analysis
  extractResumeSections(text) {
    const sections = {
      contact: '',
      summary: '',
      experience: '',
      education: '',
      skills: '',
      projects: '',
      certifications: '',
      other: ''
    };

    // Simple regex-based section detection
    const sectionPatterns = {
      contact: /^[^\n]*(?:phone|email|linkedin|github|address)[^\n]*$/gim,
      summary: /(?:summary|profile|objective)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i,
      experience: /(?:experience|employment|work history)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i,
      education: /(?:education|academic)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i,
      skills: /(?:skills|technical|technologies|proficiencies)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i,
      projects: /(?:projects|portfolio)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i,
      certifications: /(?:certifications|licenses)[:\s]*([^]*?)(?=\n\s*[A-Z\s]{2,}:|$)/i
    };

    Object.keys(sectionPatterns).forEach(section => {
      const match = text.match(sectionPatterns[section]);
      if (match) {
        sections[section] = match[1] ? match[1].trim() : match[0].trim();
      }
    });

    // If we couldn't parse sections well, put everything in other
    const totalSectionLength = Object.values(sections).join('').length;
    if (totalSectionLength < text.length * 0.3) {
      sections.other = text;
    }

    return sections;
  }
}

const pdfParser = new PDFParser();
export default pdfParser;