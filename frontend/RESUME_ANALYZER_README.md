# AI Resume Analyzer Setup

This guide explains how to set up and use the AI-powered resume analyzer feature in DevHub+.

## Features

✅ **PDF Text Extraction** - Client-side PDF parsing using PDF.js  
✅ **Gemini AI Integration** - Powered by Google's Gemini AI model  
✅ **Comprehensive Analysis** - Overall score, ATS compatibility, keyword optimization  
✅ **Detailed Feedback** - Section-by-section analysis and recommendations  
✅ **Skills Gap Analysis** - Current skills vs. missing skills identification  
✅ **Drag & Drop Upload** - Modern file upload with progress indicators  
✅ **Report Download** - Export analysis results as text report  

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key (free tier available)
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies

The required dependencies are already installed:
- `pdfjs-dist` - For PDF text extraction
- `@google/generative-ai` - For Gemini AI integration

## Usage

1. **Upload Resume**: Drag and drop a PDF file or click to browse
2. **Add Context** (Optional): Specify target role and additional comments
3. **Analysis**: The system automatically extracts text and analyzes with AI
4. **Review Results**: Get comprehensive feedback across multiple categories
5. **Download Report**: Export detailed analysis as a text file

## Analysis Categories

### Overall Metrics
- **Resume Score** (1-100): Overall resume quality assessment
- **ATS Compatibility** (1-100): How well the resume works with ATS systems
- **Keywords Found**: Technical and role-relevant keywords identified

### Detailed Analysis
- **Strengths**: What's working well in the resume
- **Areas for Improvement**: Specific weaknesses to address
- **Missing Elements**: Important sections or information to add
- **Keyword Optimization**: Found vs. suggested keywords

### Section-by-Section Feedback
- Contact Information
- Professional Experience
- Education
- Technical Skills
- Achievements
- Formatting

### Recommendations
- Prioritized suggestions (High/Medium/Low priority)
- Category-specific improvements
- ATS optimization tips

### Skills Gap Analysis
- Current skills identified
- Missing skills for target role
- Recommended learning path

## File Support

- **Supported**: PDF files up to 5MB
- **Requirements**: Text-based PDFs (not scanned images)
- **Note**: Password-protected PDFs are not supported

## Error Handling

The system provides helpful error messages for:
- Invalid file types
- File size limits
- PDF parsing issues
- API connectivity problems
- Missing API keys

## Privacy & Security

- All processing happens client-side or through secure APIs
- PDF text is sent to Gemini AI for analysis only
- No files are stored permanently
- API keys are kept in environment variables

## Fallback Behavior

If the Gemini API is unavailable:
- Basic keyword analysis still works
- Fallback suggestions are provided
- Users are notified about API requirements

## Customization

The analysis can be customized by:
- Specifying target role for role-specific feedback
- Adding context about experience level
- Providing specific areas of focus

---

For technical support or feature requests, please contact the development team.
