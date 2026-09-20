import { apply } from './chrome/apply.js';
import { solveCaptchaChallenge } from './agents/solveCaptchaAgent.js';

const captchaCallback = async ({ prompt, images }: { prompt: string; images: Array<{ id: number; url: string }> }): Promise<number[]> => {
  console.log('h: test captcha prompt', prompt);
  console.log('h: test captcha images', images);
  try {
    const ids = await solveCaptchaChallenge(prompt, images);
    console.log('h: test captcha ids', ids);
    return ids;
  } catch (e) {
    console.error('h: solveCaptchaChallenge error', e);
    return [];
  }
};

apply(
  'https://ca.indeed.com/viewjob?jk=c4d2206a4ae7db51&q=Java+Developer&l=Oshawa%2C+ON&tk=1jqft5ttigcsi800&from=web&advn=7694151224547889&adid=457158498&ad=-6NYlbfkN0CEjgYx4CqyL3Vlxsn0i_DB2XU1O_WsFkySadfPzKeZ40aMjYLk8QdtO1OkUdDcvkWXZzd0vbVRzs9IKbhK207kv3wR8WMyC1e2tGLonfzQ3E-GBNdEB5e1EteqP9aSfzXl3ix_67U4ZD-2W4DUuvkv8y8QPlkHxoTLK44Nvfw6R6lz52SQw2_eTtRYXmgxbJxQ8bhsM2vXu_HhSLGrXZtfJU2WXOZiXRnEFwAhD_y1b9cGetc5Wf4fXF3Rdw8Eyjd1JZJxCK2Ipr_d05dOtgab-zjodcnlzYjBcJB8mewVlPsOs8pQLg8GxNsAmk4Yy3G4zIv0xsGASOzRHDiJdxLs7FqCFVWIgWr7QQxWojwZN89xuQx7biTGG2D7mLLEz2E-1F96nBloeW5lqnT8k9vmo4g08CSfp5P1wbyeW_7UdcHwIpRIvTrQDGMt1kZOyuRX0v_UNB2A8fa90HQstevhUC1UgNCd47v70svAhwCdRO6G2M-OT6cgba09f6uIDAxlxzC3yRRCXaIrn4ReIYOC1C0hP-fe0AsqaFJrxBXX2RsH5xI-4Wp9g-eskLdOs4ciEtxIqVPxpyZWRMWG4IjWypGRmoVLP3IhDzSVBs0fvw%3D%3D&sjdu=bQ-p5nF_-wQR0tr5g4eTxpdoyxDTxCHKKY_s4ZX6lOTJcEE2XIGjuYx-m_JD3EU8AMlX1bhUsYDbYmFOYAiKJyJ9HpNfqtVXz2KLlvScBws&acatk=1jqft69uki9fo801&pub=4a1b367933fd867b19b072952f68dceb&camk=UoKtGZLa3XJLCqfJIefqag%3D%3D&xkcb=SoCt6_M3iPyYFvgH5D0ObzkdCdPP&xpse=SoCh6_I3iPyW5fQHRp0IbzkdCdPP&xfps=39ed4d3f-7964-46e9-8931-13a46dca99c4&vjs=3',
  'C:/Users/juanc/AI Projects/jobs/ftp_data/dev/6.pdf',
  new Map(),
  (status: any) => { console.log('Application status:', status); },
  (q: any) => { console.log('Question callback:', q); },
  async ({ prompt, images }: { prompt: string; images: Array<{ id: number; url: string }> }) => await captchaCallback({ prompt, images })
).catch(e => { console.error('apply error', e); });
