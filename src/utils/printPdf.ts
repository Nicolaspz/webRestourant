import { loadPdfRenderer } from './loadPdfRenderer';

/** Imprime o mesmo PDF numa página HTML da aplicação, sem usar o visualizador PDF do navegador. */
export async function printPdf(blob: Blob): Promise<void> {
  const pdfjs = await loadPdfRenderer();
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const frame = document.createElement('iframe');
  frame.title = 'Documento para impressão';
  Object.assign(frame.style, { position: 'fixed', left: '-10000px', top: '0', width: '800px', height: '600px', border: '0' });
  const cleanup = () => frame.remove();
  try {
    const pdf = await task.promise;
    // about:blank herda a origem da aplicação. Nunca navegar este frame para um PDF/blob.
    document.body.appendChild(frame);
    const target = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!target || !doc) throw new Error('Janela de impressão indisponível');
    const style = doc.createElement('style');
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const mm = (points: number) => points * 25.4 / 72;
    style.textContent = `@page { size: ${mm(firstViewport.width)}mm ${mm(firstViewport.height)}mm; margin: 0; }
      html, body { margin: 0; padding: 0; } canvas { display: block; break-after: page; } canvas:last-child { break-after: auto; }`;
    doc.head.appendChild(style);
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = index === 1 ? firstPage : await pdf.getPage(index);
      const size = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 300 / 72 });
      const canvas = doc.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${mm(size.width)}mm`;
      canvas.style.height = `${mm(size.height)}mm`;
      doc.body.appendChild(canvas);
      await page.render({ canvas, viewport, intent: 'print' }).promise;
      page.cleanup();
    }
    await new Promise<void>(resolve => window.setTimeout(resolve, 100));
    target.focus();
    target.print();
    // Conservar as páginas enquanto o diálogo de impressão está aberto.
    window.setTimeout(cleanup, 300000);
  } catch (error) {
    cleanup();
    throw error;
  } finally {
    await task.destroy();
  }
}
