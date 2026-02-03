import { useRef, useState, useEffect } from "react";

interface ImageEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

interface BlurRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  const [currentRegion, setCurrentRegion] = useState<BlurRegion | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Scale to fit screen
      const maxWidth = Math.min(window.innerWidth - 48, 600);
      const maxHeight = window.innerHeight - 200;
      const scaleW = maxWidth / img.width;
      const scaleH = maxHeight / img.height;
      setScale(Math.min(scaleW, scaleH, 1));
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    drawCanvas();
  }, [image, regions, currentRegion, scale]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;

    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    // Draw original image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Apply blur to all regions
    for (const region of regions) {
      applyPixelate(ctx, region);
    }

    // Draw current region being drawn (preview)
    if (currentRegion) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRegion.x * scale,
        currentRegion.y * scale,
        currentRegion.width * scale,
        currentRegion.height * scale
      );
      ctx.setLineDash([]);
    }
  }

  function applyPixelate(
    ctx: CanvasRenderingContext2D,
    region: BlurRegion,
    useScale: number = scale,
    pixelSizeOverride?: number
  ) {
    // Scale pixelSize proportionally: when exporting at full res, use larger blocks
    // to match the visual appearance in the preview
    const basePixelSize = 10;
    const pixelSize =
      pixelSizeOverride ??
      Math.max(1, Math.round((basePixelSize / scale) * useScale));
    const x = Math.round(region.x * useScale);
    const y = Math.round(region.y * useScale);
    const w = Math.round(region.width * useScale);
    const h = Math.round(region.height * useScale);
    if (w <= 0 || h <= 0) return;

    // Get image data
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    // Pixelate
    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        // Get average color of block
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let by = 0; by < pixelSize && py + by < h; by++) {
          for (let bx = 0; bx < pixelSize && px + bx < w; bx++) {
            const i = ((py + by) * w + (px + bx)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Apply average color to block
        for (let by = 0; by < pixelSize && py + by < h; by++) {
          for (let bx = 0; bx < pixelSize && px + bx < w; bx++) {
            const i = ((py + by) * w + (px + bx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, x, y);
  }

  function getCanvasCoords(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }

  function handleStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentRegion({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasCoords(e);

    setCurrentRegion({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  }

  function handleEnd() {
    if (!isDrawing || !currentRegion) return;
    setIsDrawing(false);

    // Only add if region is meaningful size
    if (currentRegion.width > 5 && currentRegion.height > 5) {
      setRegions((prev) => [...prev, currentRegion]);
    }
    setCurrentRegion(null);
  }

  function handleUndo() {
    setRegions((prev) => prev.slice(0, -1));
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // Create full-resolution canvas for export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.width;
    exportCanvas.height = image.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Draw original image at full size
    ctx.drawImage(image, 0, 0);

    // Apply blur regions at full size (scale=1 since we're at full resolution)
    for (const region of regions) {
      applyPixelate(ctx, region, 1);
    }

    exportCanvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  if (!image) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white">이미지 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            취소
          </button>
          <button
            onClick={handleUndo}
            disabled={regions.length === 0}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            실행취소
          </button>
        </div>
        <div className="text-sm text-gray-400">
          드래그하여 이름표를 가려주세요
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
        >
          저장
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="cursor-crosshair touch-none"
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      </div>

      {/* Help text */}
      <div className="bg-gray-900 text-gray-400 text-center py-2 text-sm">
        {regions.length > 0
          ? `${regions.length}개 영역 가림 처리됨`
          : "이름표 위를 드래그하여 가려주세요"}
      </div>
    </div>
  );
}
