import fs from 'fs';
import PptxGenJS from 'pptxgenjs';
import PDFDocument from 'pdfkit';
import { graph } from './graph/graph.js';
import dotenv from 'dotenv';
dotenv.config();

async function createTestFiles() {
  // Create PDF
  const pdfPath = 'test-doc.pdf';
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));
  doc.text('This is a test PDF document about CortexAI PDF Assistant testing capabilities. It proves the pdfRag agent can read and process PDF files successfully.');
  doc.end();

  // Create PPT
  const pptPath = 'test-doc.pptx';
  const ppt = new PptxGenJS();
  const slide = ppt.addSlide();
  slide.addText('This is a test PPT document about CortexAI PPT capabilities. It proves the pptRag agent can read and process presentation files successfully.', { x: 1, y: 1, w: '80%', h: 1 });
  await ppt.writeFile({ fileName: pptPath });

  return { pdfPath, pptPath };
}

async function testGraph(prompt, fileData, mimetype) {
  console.log(`\nTesting with prompt: "${prompt}", mimetype: ${mimetype}`);
  
  // Create a copy of the file for the agent to process (since the agent unlinks the file)
  const tempFile = `temp-${Date.now()}.${mimetype.includes('pdf') ? 'pdf' : 'pptx'}`;
  fs.copyFileSync(fileData, tempFile);
  
  const state = {
    prompt,
    conversationId: 'test-conv-123',
    agent: 'auto',
    userId: 'test-user',
    file: {
      path: tempFile,
      mimetype
    }
  };
  
  try {
    const result = await graph.invoke(state);
    console.log(`Agent routed to: ${result.agent}`);
    console.log(`AI Response: \n${result.aiResponse}`);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

async function main() {
  console.log("Setting up test files...");
  const { pdfPath, pptPath } = await createTestFiles();
  
  // Wait a bit for files to be fully written
  await new Promise(r => setTimeout(r, 1500));

  console.log("\n--- Testing PDF ---");
  await testGraph('What does the PDF document prove?', pdfPath, 'application/pdf');
  
  console.log("\n--- Testing PPT ---");
  await testGraph('What does the PPT document prove?', pptPath, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  
  console.log("\nCleanup...");
  try {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    if (fs.existsSync(pptPath)) fs.unlinkSync(pptPath);
  } catch (e) {}

  process.exit(0);
}

main();
