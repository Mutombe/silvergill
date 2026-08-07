import React, { useRef, useState } from 'react';
import { Camera, X, ImagePlus } from 'lucide-react';

/**
 * Photo attachment for PODs, incidents and inspections.
 *
 * `capture="environment"` opens the rear camera directly on a phone and falls
 * back to the file picker on desktop. Images are downscaled before they are
 * stored — a 12MP phone photo would blow the localStorage quota inside three
 * uploads, and the real upload path will want them compressed anyway.
 */
const MAX_EDGE = 1024;
const QUALITY = 0.72;

function downscale(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', QUALITY),
          name: file.name,
          size: canvas.width * canvas.height,
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const PhotoCapture = ({ photos = [], onChange, max = 6, label = 'Add photos' }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, max - photos.length);
    if (!files.length) return;
    setBusy(true);
    try {
      const processed = await Promise.all(files.map(downscale));
      onChange([...photos, ...processed]);
    } catch {
      // A file the browser could not decode — skip it rather than break the form.
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const removeAt = (index) => onChange(photos.filter((_, i) => i !== index));

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {photos.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-silver-200 group">
            <img src={photo.dataUrl} alt={photo.name || `Attachment ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-silver-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-xl border-2 border-dashed border-silver-300 flex flex-col items-center justify-center gap-1.5 text-silver-400 hover:border-primary-400 hover:text-primary-500 transition-colors disabled:opacity-50"
          >
            {busy ? <div className="loader" style={{ width: 22, height: 22, borderWidth: 3 }} /> : <Camera size={20} />}
            <span className="text-[11px] font-medium">{busy ? 'Processing' : label}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <p className="text-xs text-silver-400 mt-2 flex items-center gap-1.5">
        <ImagePlus size={12} />
        {photos.length} of {max} attached · compressed to {MAX_EDGE}px before upload
      </p>
    </div>
  );
};

export default PhotoCapture;
