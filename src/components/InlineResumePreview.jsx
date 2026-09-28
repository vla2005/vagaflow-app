import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, Share2 } from 'lucide-react';
import PdfDocumentPreview from './PdfDocumentPreview.jsx';

function fileName(job) {
  const slug = job.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `curriculo-${slug || 'personalizado'}.pdf`;
}

export default function InlineResumePreview({ job }) {
  const [zoom, setZoom] = useState(1);
  const [blob, setBlob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const resumeUrl = useMemo(() => blob ? URL.createObjectURL(blob) : '', [blob]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/jobs/${job.id}/resume`, { credentials: 'include', headers: { Accept: 'application/pdf' } })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível gerar o currículo.');
        return response.blob();
      })
      .then((result) => { if (active) setBlob(result); })
      .catch((requestError) => { if (active) { setError(requestError.message); setLoading(false); } });

    return () => { active = false; };
  }, [job.id]);

  useEffect(() => () => { if (resumeUrl) URL.revokeObjectURL(resumeUrl); }, [resumeUrl]);

  const handleDocumentLoaded = useCallback((pages) => {
    setPageCount(pages);
    setLoading(false);
  }, []);

  const handlePreviewError = useCallback(() => {
    setError('Não foi possível exibir o currículo.');
    setLoading(false);
  }, []);

  function download() {
    if (!resumeUrl) return;
    const link = document.createElement('a');
    link.href = resumeUrl;
    link.download = fileName(job);
    link.click();
  }

  async function share() {
    if (!blob) return;
    const file = new File([blob], fileName(job), { type: 'application/pdf' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `Currículo para ${job.title}`, files: [file] }).catch(() => {});
      return;
    }
    download();
  }

  return (
    <section className="inline-resume-preview" aria-label="Currículo personalizado">
      <header className="inline-resume-heading">
        <FileText />
        <div><h3>Currículo personalizado</h3><span><CheckCircle2 />Pronto</span></div>
      </header>

      <div className="pdf-preview-shell">
        {loading && <div className="pdf-loading"><span /><p>Gerando visualização...</p></div>}
        {error && <p className="form-error">{error}</p>}
        {blob && (
          <PdfDocumentPreview
            blob={blob}
            zoom={zoom}
            onDocumentLoaded={handleDocumentLoaded}
            onPageVisible={setVisiblePage}
            onError={handlePreviewError}
          />
        )}
      </div>

      <div className="inline-resume-toolbar">
        <div className="pdf-controls" aria-label="Controles da visualização">
          <button type="button" onClick={() => setZoom((value) => Math.max(.75, value - .25))} disabled={zoom <= .75} aria-label="Diminuir zoom">−</button>
          <span>{visiblePage} de {pageCount || 1}</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.75, value + .25))} disabled={zoom >= 1.75} aria-label="Aumentar zoom">+</button>
        </div>
        <div className="inline-resume-actions">
          <button type="button" onClick={share} disabled={!blob}><Share2 />Compartilhar</button>
          <button className="download" type="button" onClick={download} disabled={!blob}><Download />Baixar PDF</button>
        </div>
      </div>
    </section>
  );
}
