import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "—";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("IDLE");
  const [optimizedUrl, setOptimizedUrl] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef(null);
  const pollingRef = useRef(null);
  const previewRef = useRef("");

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const newPreview = URL.createObjectURL(selectedFile);

    previewRef.current = newPreview;
    setPreviewUrl(newPreview);
    setFile(selectedFile);
    setOptimizedUrl("");
    setMetrics(null);
    setError("");
    setStatus("READY");
  };

  const handleFileChange = (event) => {
    selectFile(event.target.files[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files[0];
    selectFile(droppedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const formData = new FormData();
    formData.append("file", file);

    setStatus("UPLOADING");
    setOptimizedUrl("");
    setMetrics(null);
    setError("");

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Upload failed.");
      }

      const taskId = data.data.task_id;

      setStatus("PROCESSING");

      pollingRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_URL}/status/${taskId}`
          );

          const statusData = await statusResponse.json();

          if (!statusResponse.ok || !statusData.success) {
            throw new Error(
              statusData.detail || "Unable to retrieve task status."
            );
          }

          const result = statusData.data;

          if (result.status === "COMPLETED") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            setStatus("COMPLETED");
            setOptimizedUrl(result.optimized_url || "");

            setMetrics({
              originalSize: result.original_size,
              optimizedSize: result.optimized_size,
              compression: result.compression_percentage,
              processingTime: result.processing_time_ms,
              filename: result.original_filename,
            });
          }

          if (result.status === "FAILED") {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            setStatus("FAILED");
            setError(
              result.error_message || "Image optimization failed."
            );
          }
        } catch (pollError) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          setStatus("FAILED");
          setError(pollError.message);
        }
      }, 1000);
    } catch (uploadError) {
      setStatus("FAILED");
      setError(uploadError.message);
    }
  };

  const resetPipeline = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setFile(null);
    setOptimizedUrl("");
    setMetrics(null);
    setError("");
    setStatus("IDLE");

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    }

    setPreviewUrl("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "UPLOADING":
        return "Uploading to S3";
      case "PROCESSING":
        return "Processing image";
      case "COMPLETED":
        return "Optimization complete";
      case "FAILED":
        return "Processing failed";
      case "READY":
        return "Ready to process";
      default:
        return "Pipeline ready";
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            MF
          </div>

          <div>
            <div className="brand-name">MediaFlow</div>
            <div className="brand-caption">
              Cloud Media Optimization
            </div>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          Pipeline Online
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              CLOUD MEDIA PROCESSING
            </div>

            <h1>
              Optimize your media
              <span> at cloud scale.</span>
            </h1>

            <p>
              Upload an image and let MediaFlow handle storage,
              asynchronous processing, optimization, and delivery
              through a distributed cloud pipeline.
            </p>

            <div className="tech-stack">
              <span>FastAPI</span>
              <span>Celery</span>
              <span>Redis</span>
              <span>AWS S3</span>
            </div>
          </div>
        </section>

        <section className="upload-card">
          <div className="section-header">
            <div>
              <div className="section-label">
                MEDIA INGESTION
              </div>

              <h2>Upload an image</h2>
            </div>

            <div className={`pipeline-badge ${status.toLowerCase()}`}>
              <span></span>
              {getStatusLabel()}
            </div>
          </div>

          <div
            className={`drop-zone ${dragActive ? "drag-active" : ""} ${
              file ? "has-file" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />

            {file ? (
              <div className="selected-file">
                <div className="file-preview">
                  <img src={previewUrl} alt="Selected preview" />
                </div>

                <div className="file-details">
                  <div className="file-name">
                    {file.name}
                  </div>

                  <div className="file-size">
                    {formatBytes(file.size)}
                  </div>

                  <div className="file-ready">
                    Image selected and ready for optimization
                  </div>
                </div>

                <button
                  className="change-file"
                  onClick={(event) => {
                    event.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="empty-upload">
                <div className="upload-icon">
                  ↑
                </div>

                <h3>
                  Drop your image here
                </h3>

                <p>
                  or click to browse from your computer
                </p>

                <div className="file-types">
                  JPG · PNG · WEBP
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span>!</span>
              {error}
            </div>
          )}

          <div className="action-row">
            <button
              className="optimize-button"
              onClick={handleUpload}
              disabled={
                !file ||
                status === "UPLOADING" ||
                status === "PROCESSING"
              }
            >
              {status === "UPLOADING"
                ? "Uploading..."
                : status === "PROCESSING"
                ? "Processing..."
                : "Optimize Image"}
            </button>

            {(status === "COMPLETED" || status === "FAILED") && (
              <button
                className="reset-button"
                onClick={resetPipeline}
              >
                Process Another
              </button>
            )}
          </div>
        </section>

        {status === "PROCESSING" && (
          <section className="processing-card">
            <div className="processing-animation">
              <div className="processing-ring"></div>
            </div>

            <div>
              <h3>Processing your image</h3>
              <p>
                Celery worker is optimizing the asset in the
                background.
              </p>
            </div>

            <div className="processing-state">
              <span></span>
              LIVE
            </div>
          </section>
        )}

        {metrics && status === "COMPLETED" && (
          <>
            <section className="metrics-section">
              <div className="section-header compact">
                <div>
                  <div className="section-label">
                    PIPELINE PERFORMANCE
                  </div>

                  <h2>Optimization metrics</h2>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">
                    IN
                  </div>

                  <div className="metric-title">
                    Original Size
                  </div>

                  <div className="metric-value">
                    {formatBytes(metrics.originalSize)}
                  </div>

                  <div className="metric-subtitle">
                    Source asset
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    OUT
                  </div>

                  <div className="metric-title">
                    Optimized Size
                  </div>

                  <div className="metric-value">
                    {formatBytes(metrics.optimizedSize)}
                  </div>

                  <div className="metric-subtitle">
                    Processed asset
                  </div>
                </div>

                <div className="metric-card highlight">
                  <div className="metric-icon">
                    %
                  </div>

                  <div className="metric-title">
                    Compression
                  </div>

                  <div className="metric-value">
                    {Number(metrics.compression).toFixed(2)}%
                  </div>

                  <div className="metric-subtitle">
                    Storage reduction
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    MS
                  </div>

                  <div className="metric-title">
                    Processing Time
                  </div>

                  <div className="metric-value">
                    {Number(metrics.processingTime).toFixed(2)} ms
                  </div>

                  <div className="metric-subtitle">
                    Worker execution
                  </div>
                </div>
              </div>
            </section>

            <section className="comparison-section">
              <div className="section-header compact">
                <div>
                  <div className="section-label">
                    OUTPUT PREVIEW
                  </div>

                  <h2>Before and after</h2>
                </div>
              </div>

              <div className="comparison-grid">
                <div className="image-card">
                  <div className="image-card-header">
                    <span>ORIGINAL</span>
                    <span>{formatBytes(metrics.originalSize)}</span>
                  </div>

                  <div className="image-container">
                    <img
                      src={previewUrl}
                      alt="Original"
                    />
                  </div>
                </div>

                <div className="comparison-arrow">
                  →
                </div>

                <div className="image-card">
                  <div className="image-card-header">
                    <span>OPTIMIZED</span>
                    <span>{formatBytes(metrics.optimizedSize)}</span>
                  </div>

                  <div className="image-container">
                    <img
                      src={optimizedUrl}
                      alt="Optimized"
                    />
                  </div>
                </div>
              </div>

              <div className="delivery-bar">
                <div>
                  <div className="delivery-label">
                    OPTIMIZED ASSET
                  </div>

                  <div className="delivery-url">
                    AWS S3 delivery target
                  </div>
                </div>

                <a
                  href={optimizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="open-button"
                >
                  Open Asset ↗
                </a>
              </div>
            </section>
          </>
        )}

        <footer>
          <div>
            MediaFlow · Asynchronous Cloud Media Processing
          </div>

          <div className="footer-status">
            <span></span>
            All systems operational
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;