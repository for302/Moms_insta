import { useState } from "react";
import {
  Image,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
} from "lucide-react";
import { useImageStore } from "@/stores/imageStore";

interface RightPanelProps {
  className?: string;
}

type DownloadOption = "image_only" | "image_with_text";

export default function RightPanel({ className }: RightPanelProps) {
  const {
    images,
    currentIndex,
    setCurrentIndex,
    nextImage,
    previousImage,
    downloadCurrent,
    downloadAll,
  } = useImageStore();

  // Default to image_with_text (이미지+텍스트)
  const [downloadOption, setDownloadOption] =
    useState<DownloadOption>("image_with_text");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentImage = images[currentIndex];
  const hasImages = images.length > 0;

  const handleDownloadCurrent = () => {
    if (currentImage) {
      downloadCurrent(downloadOption === "image_with_text");
    }
  };

  const handleDownloadAll = () => {
    downloadAll(downloadOption === "image_with_text");
  };

  return (
    <aside className={`panel flex flex-col ${className}`}>
      <div className="panel-header flex items-center gap-2">
        <Image className="w-4 h-4" />
        <span>이미지 미리보기</span>
        {hasImages && (
          <span className="text-sm text-gray-500">
            ({currentIndex + 1}/{images.length})
          </span>
        )}
      </div>

      <div className="panel-body flex flex-col gap-4 flex-1 overflow-hidden">
        {/* Main Image Preview */}
        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {currentImage ? (
            <>
              <img
                src={currentImage.url}
                alt={`Generated image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              {/* Navigation Buttons */}
              <button
                onClick={previousImage}
                disabled={currentIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                disabled={currentIndex === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="text-gray-400 text-center">
              <Image className="w-16 h-16 mx-auto mb-2" />
              <p>생성된 이미지가 없습니다</p>
            </div>
          )}
        </div>

        {/* Thumbnail List */}
        {hasImages && (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? "border-primary-500 ring-2 ring-primary-200"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Options - One Line Layout */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {/* Download Option Dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="input flex items-center gap-1 cursor-pointer text-sm py-2 px-3 min-w-[120px]"
              >
                <span>
                  {downloadOption === "image_only"
                    ? "이미지만"
                    : "이미지+텍스트"}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setDownloadOption("image_with_text");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      downloadOption === "image_with_text"
                        ? "bg-primary-50 text-primary-700"
                        : ""
                    }`}
                  >
                    이미지+텍스트
                  </button>
                  <button
                    onClick={() => {
                      setDownloadOption("image_only");
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      downloadOption === "image_only"
                        ? "bg-primary-50 text-primary-700"
                        : ""
                    }`}
                  >
                    이미지만
                  </button>
                </div>
              )}
            </div>

            {/* Download Buttons */}
            <button
              onClick={handleDownloadAll}
              disabled={!hasImages}
              className="btn btn-secondary flex items-center justify-center gap-1 text-sm py-2 px-3 flex-1"
            >
              <Download className="w-4 h-4" />
              전체
            </button>
            <button
              onClick={handleDownloadCurrent}
              disabled={!currentImage}
              className="btn btn-primary flex items-center justify-center gap-1 text-sm py-2 px-3 flex-1"
            >
              <Download className="w-4 h-4" />
              현재
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
