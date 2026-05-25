import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [optimizedUrl, setOptimizedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select an image file first!");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setStatus("Uploading raw asset to AWS S3 storage...");
    setOptimizedUrl("");
    setMetrics(null);

    const startTime = performance.now();

    try {
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      const taskId = data.task_id;
      setStatus("Ingested! Distributed workers processing task...");

      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`http://127.0.0.1:8000/status/${taskId}`);
        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          clearInterval(pollInterval);
          const endTime = performance.now();
          
          setStatus("Success! Execution loop finalized.");
          setOptimizedUrl(statusData.optimized_url);
          setMetrics({
            duration: ((endTime - startTime) / 1000).toFixed(2),
            originalName: file.name,
            originalSize: (file.size / 1024 / 1024).toFixed(2) + " MB"
          });
          setLoading(false);
        } else if (statusData.status === "failed") {
          clearInterval(pollInterval);
          setStatus("Optimization lifecycle failed.");
          setLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      setStatus("Network error connecting to pipeline cluster.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Cloud Media Optimization Engine</h1>
        <p style={styles.subtitle}>Asynchronous event-driven image processing pipeline using FastAPI, Celery, Redis, and AWS S3</p>
        
        <div style={styles.uploadArea}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={styles.fileInput} />
          <button onClick={handleUpload} disabled={loading || !file} style={loading ? styles.btnDisabled : styles.btn}>
            {loading ? "Processing Loop Active..." : "Dispatch Asset"}
          </button>
        </div>

        {status && (
          <div style={styles.statusBox}>
            <span style={styles.badge}>System Status:</span> {status}
          </div>
        )}

        {metrics && (
          <div style={styles.metricsContainer}>
            <h3 style={styles.sectionTitle}>Pipeline Performance Metrics</h3>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}><strong>Filename:</strong> <span style={styles.metricVal}>{metrics.originalName}</span></div>
              <div style={styles.metricCard}><strong>Input Weight:</strong> <span style={styles.metricVal}>{metrics.originalSize}</span></div>
              <div style={styles.metricCard}><strong>Total Loop Latency:</strong> <span style={styles.metricVal}>{metrics.duration}s</span></div>
            </div>
          </div>
        )}

        {optimizedUrl && (
          <div style={styles.resultContainer}>
            <h3 style={styles.sectionTitle}>Optimized Asset Delivery Target</h3>
            <img src={optimizedUrl} alt="Optimized Pipeline Output" style={styles.image} />
            <br />
            <a href={optimizedUrl} target="_blank" rel="noreferrer" style={styles.link}>
              Inspect CDN Edge URL ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Inter', sans-serif", padding: "20px" },
  card: { backgroundColor: "#1e293b", padding: "40px", borderRadius: "16px", maxWidth: "700px", width: "100%", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" },
  title: { fontSize: "28px", fontWeight: "700", marginBottom: "8px", background: "linear-gradient(to right, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subtitle: { color: "#94a3b8", fontSize: "14px", lineHeight: "1.5", marginBottom: "30px" },
  uploadArea: { display: "flex", gap: "15px", alignItems: "center", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px dashed #334155" },
  fileInput: { color: "#94a3b8" },
  btn: { backgroundColor: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "6px", cursor: "pointer", transition: "background-color 0.2s" },
  btnDisabled: { backgroundColor: "#334155", color: "#64748b", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "not-allowed" },
  statusBox: { marginTop: "20px", padding: "12px 16px", backgroundColor: "#020617", borderRadius: "8px", fontSize: "14px", borderLeft: "4px solid #3b82f6", color: "#cbd5e1" },
  badge: { color: "#38bdf8", fontWeight: "6px" },
  sectionTitle: { fontSize: "16px", fontWeight: "6px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "15px", marginTop: "30px" },
  metricsContainer: { animation: "fadeIn 0.5s ease" },
  metricsGrid: { display: "flex", gap: "15px", flexWrap: "wrap" },
  metricCard: { flex: 1, minWidth: "150px", backgroundColor: "#0f172a", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#94a3b8", border: "1px solid #1e293b" },
  metricVal: { display: "block", color: "#f8fafc", fontSize: "15px", fontWeight: "6px", marginTop: "4px" },
  resultContainer: { marginTop: "20px", textAlign: "center" },
  image: { maxWidth: "100%", maxHeight: "350px", borderRadius: "12px", border: "2px solid #334155", marginTop: "10px" },
  link: { display: "inline-block", marginTop: "15px", color: "#38bdf8", textDecoration: "none", fontWeight: "500", fontSize: "14px" }
};

export default App;