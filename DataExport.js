const DataExport = {
  download() {
    ClickLogger.download("csv");
  },
};

document
  .getElementById("export-data-button")
  .addEventListener("click", DataExport.download);
