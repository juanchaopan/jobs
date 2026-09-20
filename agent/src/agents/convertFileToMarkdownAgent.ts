import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import * as pdfParseModule from 'pdf-parse';
const { PDFParse } = pdfParseModule as unknown as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } };
import mammoth from 'mammoth';

const model = new ChatOpenAI({
  model: process.env.LANGUAGE_MODEL ?? '',
  apiKey: process.env.LANGUAGE_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.LANGUAGE_MODEL_BASE_URL ?? '',
  },
});

const systemPrompt = `You are a resume-to-Markdown converter. Given a resume file, produce a single clean, well-structured Markdown string suitable for display and structured parsing.

Extract and preserve sections when present: Name, Title, Contact (email/phone/location), Summary, Experience (company, role, start/end dates, bullet responsibilities/achievements), Education, Skills, Certifications, Projects, and Publications.

Formatting rules:
- Use appropriate Markdown headings, subheadings, and bullet lists.
- Format job entries consistently as "Company — Role — YYYY-MM to YYYY-MM" when dates are available.
- Normalize dates to YYYY-MM when possible.
- Do NOT invent facts or add missing details; only reformat and clarify what's present.

If the input is unreadable or not a resume, return exactly "UNCONVERTIBLE: <short reason>" and nothing else.`;

const responseFormat = z.object({
  markdown: z.string().describe('The file converted to a Markdown string'),
});

const structuredModel = model.withStructuredOutput(responseFormat);

async function extractText(file: Buffer, extension: string): Promise<string> {
  if (extension === 'pdf') {
    const parser = new PDFParse({ data: file });
    const result = await parser.getText();
    return result.text;
  }

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file });
    return result.value;
  }

  // Plain text, RTF, HTML, etc.
  return file.toString('utf-8');
}

export async function convertFileToMarkdown(file: Buffer, extension: string): Promise<string> {
  const content = await extractText(file, extension);
  const result = await structuredModel.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content },
  ]);

  const parsed = responseFormat.parse(result);
  return parsed.markdown;
}