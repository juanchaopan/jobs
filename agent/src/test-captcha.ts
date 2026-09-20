import { ChatOpenAI } from '@langchain/openai';
import fs from 'fs';

const model = new ChatOpenAI({
  model: process.env.VISION_MODEL ?? '',
  apiKey: process.env.VISION_MODEL_API_KEY,
  configuration: {
    baseURL: process.env.VISION_MODEL_BASE_URL ?? '',
  },
});

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx ts-node src/test-captcha.ts <dump-file>');
  process.exit(1);
}

const params = JSON.parse(fs.readFileSync(file, 'utf-8'));
const response = await model.invoke(params);
const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
console.log(text);
