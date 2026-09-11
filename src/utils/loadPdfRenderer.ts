let renderer: Promise<typeof import('pdfjs-dist')> | undefined;

export function loadPdfRenderer() {
  if (!renderer) {
    const url = new URL('/pdfjs/pdf.min.mjs', window.location.origin).href;
    renderer = (import(/* webpackIgnore: true */ url) as Promise<typeof import('pdfjs-dist')>)
      .then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('/pdfjs/pdf.worker.min.mjs', window.location.origin).href;
        return pdfjs;
      }).catch(error => {
        renderer = undefined;
        throw error;
      });
  }
  return renderer;
}
