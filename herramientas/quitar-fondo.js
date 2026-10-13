(() => {
  const fileInput = document.getElementById("removeBgFile");
  const upload = document.querySelector(".remove-bg-upload");
  const runButton = document.getElementById("removeBgButton");
  const resetButton = document.getElementById("resetBgButton");
  const download = document.getElementById("downloadBgButton");
  const status = document.getElementById("removeBgStatus");
  const previews = document.getElementById("removeBgPreviews");
  const originalImg = document.getElementById("removeBgOriginal");
  const resultImg = document.getElementById("removeBgResult");
  let sourceFile = null;
  let originalUrl = "";
  let resultUrl = "";
  let processing = false;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle("error", error);
  }
  function revoke(url) {
    if (url) URL.revokeObjectURL(url);
  }
  function resetResult() {
    revoke(resultUrl);
    resultUrl = "";
    resultImg.removeAttribute("src");
    download.hidden = true;
    previews.hidden = !sourceFile;
  }
  function setFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message("Elegí un archivo de imagen válido.", true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message("La imagen supera los 20 MB. Elegí un archivo más liviano para que el navegador pueda procesarlo.", true);
      return;
    }
    sourceFile = file;
    revoke(originalUrl);
    originalUrl = URL.createObjectURL(file);
    originalImg.src = originalUrl;
    previews.hidden = false;
    resetResult();
    runButton.disabled = false;
    resetButton.hidden = false;
    message("Imagen lista. Presioná «Quitar el fondo» para comenzar.");
  }
  fileInput.addEventListener("change", () => setFile(fileInput.files && fileInput.files[0]));
  ["dragenter", "dragover"].forEach(type => upload.addEventListener(type, event => {
    event.preventDefault(); upload.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach(type => upload.addEventListener(type, event => {
    event.preventDefault(); upload.classList.remove("dragging");
  }));
  upload.addEventListener("drop", event => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) { setFile(file); fileInput.files = event.dataTransfer.files; }
  });
  resetButton.addEventListener("click", () => {
    sourceFile = null;
    fileInput.value = "";
    revoke(originalUrl); originalUrl = "";
    resetResult();
    originalImg.removeAttribute("src");
    previews.hidden = true;
    runButton.disabled = true;
    resetButton.hidden = true;
    message("Elegí una imagen para comenzar.");
  });
  runButton.addEventListener("click", async () => {
    if (!sourceFile || processing) return;
    processing = true;
    runButton.disabled = true;
    download.hidden = true;
    status.classList.remove("error");
    message("Preparando el motor de eliminación de fondo. La primera vez puede tardar mientras se descargan los modelos…");
    try {
      const { removeBackground } = await import("https://esm.sh/@imgly/background-removal@1.7.0?bundle");
      const result = await removeBackground(sourceFile, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        debug: false,
        output: { format: "image/png" },
        progress: (key, current, total) => {
          if (total > 0) {
            const percent = Math.min(99, Math.round(current / total * 100));
            message("Procesando imagen y descargando recursos necesarios… " + percent + "%");
          }
        }
      });
      resetResult();
      resultUrl = URL.createObjectURL(result);
      resultImg.src = resultUrl;
      previews.hidden = false;
      download.href = resultUrl;
      download.download = (sourceFile.name.replace(/\.[^.]+$/, "") || "imagen") + "-sin-fondo.png";
      download.hidden = false;
      message("¡Listo! Revisá el resultado y descargá el PNG con transparencia.");
    } catch (error) {
      console.error("Error al quitar el fondo:", error);
      message("No se pudo quitar el fondo. Comprobá tu conexión e intentá con otra imagen. Si es la primera vez, recargá la página y volvé a probar.", true);
    } finally {
      processing = false;
      runButton.disabled = !sourceFile;
    }
  });
  window.addEventListener("beforeunload", () => {
    revoke(originalUrl); revoke(resultUrl);
  });
})();