import { useEffect, useRef, useState } from 'react';

function PdfPage({ document, pageNumber, width, zoom, onVisible }) {
  const canvasRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    if (!pageRef.current) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) onVisible(pageNumber);
    }, { threshold: [0.55] });

    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [onVisible, pageNumber]);

  useEffect(() => {
    if (!width) return undefined;

    let active = true;
    let renderTask;

    document.getPage(pageNumber).then((page) => {
      if (!active || !canvasRef.current) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const displayScale = (width / baseViewport.width) * zoom;
      const viewport = page.getViewport({ scale: displayScale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });

      renderTask.promise.catch(() => {});
    });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, width, zoom]);

  return <div className="pdf-page" ref={pageRef}><canvas ref={canvasRef} aria-label={`Página ${pageNumber} do currículo`} /></div>;
}

export default function PdfDocumentPreview({ blob, zoom, onDocumentLoaded, onPageVisible, onError }) {
  const containerRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!blob) return undefined;

    let active = true;
    let loadingTask;

    blob.arrayBuffer().then(async (data) => {
      const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);

      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      loadingTask = pdfjs.getDocument({ data });
      return loadingTask.promise;
    }).then((loadedDocument) => {
      if (!active) {
        loadedDocument.destroy();
        return;
      }

      setDocument(loadedDocument);
      onDocumentLoaded(loadedDocument.numPages);
    }).catch((error) => {
      if (active) onError(error);
    });

    return () => {
      active = false;
      loadingTask?.destroy();
    };
  }, [blob, onDocumentLoaded, onError]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const updateWidth = () => setContainerWidth(Math.min(650, Math.max(260, containerRef.current.clientWidth - 28)));
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="pdf-canvas-viewport" ref={containerRef}>
      {document && Array.from({ length: document.numPages }, (_, index) => (
        <PdfPage
          document={document}
          pageNumber={index + 1}
          width={containerWidth}
          zoom={zoom}
          onVisible={onPageVisible}
          key={index + 1}
        />
      ))}
    </div>
  );
}
