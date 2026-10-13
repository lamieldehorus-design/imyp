(() => {
  "use strict";

  const fileInput = document.getElementById("removeBgFile");
  const upload = document.querySelector(".remove-bg-upload");
  const runButton = document.getElementById("removeBgButton");
  const resetButton = document.getElementById("resetBgButton");
  const download = document.getElementById("downloadBgButton");
  const status = document.getElementById("removeBgStatus");
  const previews = document.getElementById("removeBgPreviews");
  const originalImg = document.getElementById("removeBgOriginal");
  const resultImg = document.getElementById("removeBgResult");

  if (!fileInput || !upload || !runButton || !resetButton || !download || !status ||
      !previews || !originalImg || !resultImg) {
    console.error("Quitar fondo: faltan elementos HTML requeridos.");
    return;
  }

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

  function clearResult() {
    revoke(resultUrl);
    resultUrl = "";
    resultImg.removeAttribute("src");
    download.removeAttribute("href");
    download.hidden = true;
  }

  function setFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message("El archivo elegido no parece ser una imagen compatible. Probá con JPG, PNG o WebP.", true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message("La imagen supera los 20 MB. Elegí una más liviana para evitar que el navegador se quede sin memoria.", true);
      return;
    }
    if (processing) {
      message("Esperá a que termine el procesamiento antes de elegir otra foto.", true);
      return;
    }

    sourceFile = file;
    revoke(originalUrl);
    originalUrl = URL.createObjectURL(file);
    originalImg.src = originalUrl;
    clearResult();
    previews.hidden = false;
    runButton.disabled = false;
    resetButton.hidden = false;
    message("Imagen lista. Presioná «Quitar el fondo» para comenzar.");
  }

  fileInput.addEventListener("change", () => {
    setFile(fileInput.files && fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(type => upload.addEventListener(type, event => {
    event.preventDefault();
    upload.classList.add("dragging");
  }));

  ["dragleave", "drop"].forEach(type => upload.addEventListener(type, event => {
    event.preventDefault();
    upload.classList.remove("dragging");
  }));

  upload.addEventListener("drop", event => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) setFile(file);
  });

  resetButton.addEventListener("click", () => {
    if (processing) return;
    sourceFile = null;
    fileInput.value = "";
    revoke(originalUrl);
    originalUrl = "";
    clearResult();
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
    resetButton.disabled = true;
    clearResult();
    message("Cargando el motor de IA. La primera vez puede tardar porque necesita descargar sus modelos.");

    try {
      // La distribución ESM de jsDelivr expone la función principal como exportación predeterminada.
      const module = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
      const removeBackground = module.default || module.removeBackground;

      if (typeof removeBackground !== "function") {
        throw new Error("No se encontró la función de eliminación de fondo en el módulo descargado.");
      }

      message("Motor cargado. Analizando la foto y separando el sujeto del fondo…");
      const result = await removeBackground(sourceFile, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        debug: false,
        device: "cpu",
        model: "isnet_quint8",
        output: { format: "image/png", type: "foreground" },
        progress: (key, current, total) => {
          if (total > 0) {
            const percent = Math.max(1, Math.min(99, Math.round(current / total * 100)));
            message("Preparando recursos de IA… " + percent + "%");
          }
        }
      });

      if (!(result instanceof Blob) || result.size === 0) {
        throw new Error("El motor terminó, pero no devolvió una imagen válida.");
      }

      resultUrl = URL.createObjectURL(result);
      resultImg.src = resultUrl;
      download.href = resultUrl;
      download.download = (sourceFile.name.replace(/\.[^.]+$/, "") || "imagen") + "-sin-fondo.png";
      previews.hidden = false;
      download.hidden = false;
      message("¡Listo! Revisá el resultado sobre el damero y descargá el PNG transparente.");
    } catch (error) {
      console.error("Error al quitar el fondo:", error);
      const detail = error && error.message ? error.message : String(error);
      if (/fetch|network|load|import|module|wasm|onnx|cors/i.test(detail)) {
        message("No se pudieron cargar los recursos de IA. Revisá la conexión, desactivá bloqueadores para esta página y volvé a intentar. Detalle: " + detail, true);
      } else {
        message("No se pudo procesar esta foto. Probá con un JPG o PNG más pequeño y con el sujeto bien separado del fondo. Detalle: " + detail, true);
      }
    } finally {
      processing = false;
      runButton.disabled = !sourceFile;
      resetButton.disabled = false;
    }
  });

  window.addEventListener("beforeunload", () => {
    revoke(originalUrl);
    revoke(resultUrl);
  });
})();