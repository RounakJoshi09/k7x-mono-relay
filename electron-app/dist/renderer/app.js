// Tally Database Loader - Renderer Application

class TallyDatabaseApp {
  constructor() {
    this.config = null;
    this.syncStatus = {
      isRunning: false,
      progress: 0,
      currentTable: "",
      message: "Ready",
    };

    this.init();
  }

  async init() {
    try {
      // Initialize the application
      await this.loadAppVersion();
      await this.loadConfiguration();
      this.setupEventListeners();
      this.setupIPCListeners();
      this.updateUI();

      console.log("Tally Database Loader initialized successfully");
    } catch (error) {
      console.error("Failed to initialize application:", error);
      this.showToast("Error", "Failed to initialize application", "error");
    }
  }

  async loadAppVersion() {
    try {
      const version = await window.tallyAPI.getAppVersion();
      document.getElementById("app-version").textContent = `v${version}`;
    } catch (error) {
      console.error("Failed to load app version:", error);
    }
  }

  async loadConfiguration() {
    try {
      this.config = await window.tallyAPI.loadConfig();
      this.populateFormFromConfig();
      console.log("Configuration loaded successfully");
    } catch (error) {
      console.error("Failed to load configuration:", error);
      this.showToast("Error", "Failed to load configuration", "error");
    }
  }

  async saveConfiguration() {
    try {
      this.config = this.getConfigFromForm();

      // Validate configuration
      const validation = await window.tallyAPI.validateConfig(this.config);
      if (!validation.isValid) {
        this.showToast(
          "Validation Error",
          validation.errors.join("\n"),
          "error"
        );
        return false;
      }

      await window.tallyAPI.saveConfig(this.config);
      this.showToast("Success", "Configuration saved successfully", "success");
      return true;
    } catch (error) {
      console.error("Failed to save configuration:", error);
      this.showToast("Error", "Failed to save configuration", "error");
      return false;
    }
  }

  setupEventListeners() {
    // Database form events
    document
      .getElementById("db-technology")
      .addEventListener("change", this.onDatabaseTechnologyChange.bind(this));
    document
      .getElementById("test-db-connection")
      .addEventListener("click", this.testDatabaseConnection.bind(this));

    // Tally form events
    document
      .getElementById("test-tally-connection")
      .addEventListener("click", this.testTallyConnection.bind(this));
    document
      .getElementById("load-companies")
      .addEventListener("click", this.loadTallyCompanies.bind(this));
    document
      .getElementById("sync-mode")
      .addEventListener("change", this.onSyncModeChange.bind(this));

    // Date range events
    document.querySelectorAll('input[name="date-range"]').forEach((radio) => {
      radio.addEventListener("change", this.onDateRangeChange.bind(this));
    });

    // Control buttons
    document
      .getElementById("start-sync")
      .addEventListener("click", this.startSync.bind(this));
    document
      .getElementById("stop-sync")
      .addEventListener("click", this.stopSync.bind(this));
    document
      .getElementById("save-config")
      .addEventListener("click", this.saveConfiguration.bind(this));

    // SSH tunnel toggle
    document
      .getElementById("ssh-enabled")
      .addEventListener("change", this.onSSHToggle.bind(this));

    // Advanced options
    document
      .getElementById("export-config")
      .addEventListener("click", this.exportConfiguration.bind(this));
    document
      .getElementById("import-config")
      .addEventListener("click", this.importConfiguration.bind(this));

    // Log actions
    document
      .getElementById("clear-logs")
      .addEventListener("click", this.clearLogs.bind(this));

    // Other actions
    document
      .getElementById("view-database-structure")
      .addEventListener("click", this.viewDatabaseStructure.bind(this));
    document
      .getElementById("refresh-status")
      .addEventListener("click", this.refreshSyncStatus.bind(this));
  }

  setupIPCListeners() {
    // Listen for sync progress updates
    window.tallyAPI.onSyncProgress((data) => {
      this.updateSyncStatus(data);
    });

    // Listen for sync completion
    window.tallyAPI.onSyncComplete((data) => {
      this.onSyncComplete(data);
    });

    // Listen for sync errors
    window.tallyAPI.onSyncError((error) => {
      this.onSyncError(error);
    });

    // Listen for log messages
    window.tallyAPI.onLogMessage((message) => {
      this.addLogMessage(message);
    });

    // Listen for menu actions
    window.tallyAPI.onMenuAction((action) => {
      this.handleMenuAction(action);
    });
  }

  populateFormFromConfig() {
    if (!this.config) return;

    // Database configuration
    const db = this.config.database;
    document.getElementById("db-technology").value = db.technology || "mysql";
    document.getElementById("db-server").value = db.server || "";
    document.getElementById("db-port").value = db.port || 3306;
    document.getElementById("db-schema").value = db.schema || "";
    document.getElementById("db-username").value = db.username || "";
    document.getElementById("db-password").value = db.password || "";
    document.getElementById("db-ssl").checked = db.ssl || false;
    document.getElementById("db-load-method").value = db.loadmethod || "insert";

    // SSH tunnel configuration
    if (db.ssh_tunnel) {
      document.getElementById("ssh-enabled").checked =
        db.ssh_tunnel.enabled || false;
      document.getElementById("ssh-host").value = db.ssh_tunnel.host || "";
      document.getElementById("ssh-port").value = db.ssh_tunnel.port || 22;
      document.getElementById("ssh-username").value =
        db.ssh_tunnel.username || "";
      document.getElementById("ssh-password").value =
        db.ssh_tunnel.password || "";
      document.getElementById("ssh-private-key").value =
        db.ssh_tunnel.privateKey || "";
      document.getElementById("ssh-local-port").value =
        db.ssh_tunnel.localPort || 3307;
      document.getElementById("ssh-remote-host").value =
        db.ssh_tunnel.remoteHost || "localhost";
      document.getElementById("ssh-remote-port").value =
        db.ssh_tunnel.remotePort || 3306;
      this.onSSHToggle();
    }

    // Tally configuration
    const tally = this.config.tally;
    document.getElementById("tally-server").value = tally.server || "localhost";
    document.getElementById("tally-port").value = tally.port || 9000;
    document.getElementById("tally-company").value = tally.company || "";
    document.getElementById("sync-mode").value = tally.sync || "full";
    document.getElementById("sync-frequency").value = tally.frequency || 0;
    document.getElementById("definition-file").value =
      tally.definition || "tally-export-config.yaml";

    // Date range
    if (tally.fromdate === "auto" || tally.todate === "auto") {
      document.getElementById("date-auto").checked = true;
    } else {
      document.getElementById("date-custom").checked = true;
      document.getElementById("from-date").value = tally.fromdate;
      document.getElementById("to-date").value = tally.todate;
    }

    this.onDatabaseTechnologyChange();
    this.onSyncModeChange();
    this.onDateRangeChange();
  }

  getConfigFromForm() {
    return {
      database: {
        technology: document.getElementById("db-technology").value,
        server: document.getElementById("db-server").value,
        port: parseInt(document.getElementById("db-port").value) || 3306,
        ssl: document.getElementById("db-ssl").checked,
        schema: document.getElementById("db-schema").value,
        username: document.getElementById("db-username").value,
        password: document.getElementById("db-password").value,
        loadmethod: document.getElementById("db-load-method").value,
        ssh_tunnel: document.getElementById("ssh-enabled").checked
          ? {
              enabled: true,
              host: document.getElementById("ssh-host").value,
              port: parseInt(document.getElementById("ssh-port").value) || 22,
              username: document.getElementById("ssh-username").value,
              password: document.getElementById("ssh-password").value,
              privateKey: document.getElementById("ssh-private-key").value,
              localPort:
                parseInt(document.getElementById("ssh-local-port").value) ||
                3307,
              remoteHost: document.getElementById("ssh-remote-host").value,
              remotePort:
                parseInt(document.getElementById("ssh-remote-port").value) ||
                3306,
            }
          : { enabled: false },
      },
      tally: {
        definition: document.getElementById("definition-file").value,
        server: document.getElementById("tally-server").value,
        port: parseInt(document.getElementById("tally-port").value) || 9000,
        company: document.getElementById("tally-company").value,
        fromdate: document.getElementById("date-auto").checked
          ? "auto"
          : document.getElementById("from-date").value,
        todate: document.getElementById("date-auto").checked
          ? "auto"
          : document.getElementById("to-date").value,
        sync: document.getElementById("sync-mode").value,
        frequency:
          parseInt(document.getElementById("sync-frequency").value) || 0,
      },
    };
  }

  onDatabaseTechnologyChange() {
    const technology = document.getElementById("db-technology").value;
    const portField = document.getElementById("db-port");
    const loadMethodField = document.getElementById("db-load-method");

    // Set default ports and load methods
    switch (technology) {
      case "mysql":
        portField.value = 3306;
        loadMethodField.value = "insert";
        break;
      case "mssql":
        portField.value = 1433;
        loadMethodField.value = "file";
        break;
      case "postgres":
        portField.value = 5432;
        loadMethodField.value = "file";
        break;
      case "bigquery":
      case "adls":
      case "csv":
        portField.value = 0;
        loadMethodField.value = "file";
        break;
    }

    // Enable/disable fields based on technology
    const needsCredentials = ["mysql", "mssql", "postgres"].includes(
      technology
    );
    document.getElementById("db-server").disabled =
      !needsCredentials && technology !== "adls";
    document.getElementById("db-port").disabled = !needsCredentials;
    document.getElementById("db-username").disabled = !needsCredentials;
    document.getElementById("db-password").disabled = !needsCredentials;
    document.getElementById("db-ssl").disabled = !needsCredentials;
  }

  onSyncModeChange() {
    const syncMode = document.getElementById("sync-mode").value;
    const definitionFile =
      syncMode === "incremental"
        ? "tally-export-config-incremental.yaml"
        : "tally-export-config.yaml";
    document.getElementById("definition-file").value = definitionFile;
  }

  onDateRangeChange() {
    const isCustom = document.getElementById("date-custom").checked;
    const customDateRange = document.getElementById("custom-date-range");
    customDateRange.style.display = isCustom ? "block" : "none";

    if (isCustom && !document.getElementById("from-date").value) {
      // Set current financial year dates
      const today = new Date();
      const currentYear = today.getFullYear();
      const startYear = today.getMonth() < 3 ? currentYear - 1 : currentYear;

      document.getElementById("from-date").value = `${startYear}-04-01`;
      document.getElementById("to-date").value = `${startYear + 1}-03-31`;
    }
  }

  onSSHToggle() {
    const enabled = document.getElementById("ssh-enabled").checked;
    const sshConfig = document.getElementById("ssh-config");
    sshConfig.style.display = enabled ? "block" : "none";
  }

  async testDatabaseConnection() {
    const button = document.getElementById("test-db-connection");
    const originalText = button.innerHTML;

    try {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';
      button.disabled = true;

      const config = this.getConfigFromForm();
      const result = await window.tallyAPI.testDatabaseConnection(config);

      if (result.success) {
        this.showToast("Success", result.message, "success");
        this.updateConnectionStatus("database", "online");
      } else {
        this.showToast("Error", result.message, "error");
        this.updateConnectionStatus("database", "offline");
      }
    } catch (error) {
      this.showToast("Error", "Connection test failed", "error");
      this.updateConnectionStatus("database", "offline");
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async testTallyConnection() {
    const button = document.getElementById("test-tally-connection");
    const originalText = button.innerHTML;

    try {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';
      button.disabled = true;

      const config = this.getConfigFromForm();
      const result = await window.tallyAPI.testTallyConnection(config);

      if (result.success) {
        this.showToast("Success", result.message, "success");
        this.updateConnectionStatus("tally", "online");
      } else {
        this.showToast("Error", result.message, "error");
        this.updateConnectionStatus("tally", "offline");
      }
    } catch (error) {
      this.showToast("Error", "Connection test failed", "error");
      this.updateConnectionStatus("tally", "offline");
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async loadTallyCompanies() {
    const button = document.getElementById("load-companies");
    const originalText = button.innerHTML;

    try {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
      button.disabled = true;

      const config = this.getConfigFromForm();
      const companies = await window.tallyAPI.getTallyCompanies(config);

      const datalist = document.getElementById("company-list");
      datalist.innerHTML = "";

      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company;
        datalist.appendChild(option);
      });

      this.showToast(
        "Success",
        `Loaded ${companies.length} companies`,
        "success"
      );
    } catch (error) {
      this.showToast("Error", "Failed to load companies", "error");
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async startSync() {
    try {
      const config = this.getConfigFromForm();

      // Validate configuration first
      const validation = await window.tallyAPI.validateConfig(config);
      if (!validation.isValid) {
        this.showToast(
          "Validation Error",
          validation.errors.join("\n"),
          "error"
        );
        return;
      }

      await window.tallyAPI.startSync(config);
      this.updateSyncButtons(true);
      this.showToast("Info", "Sync started", "info");
    } catch (error) {
      console.error("Failed to start sync:", error);
      this.showToast("Error", "Failed to start sync", "error");
    }
  }

  async stopSync() {
    try {
      await window.tallyAPI.stopSync();
      this.updateSyncButtons(false);
      this.showToast("Info", "Sync stopped", "info");
    } catch (error) {
      console.error("Failed to stop sync:", error);
      this.showToast("Error", "Failed to stop sync", "error");
    }
  }

  async refreshSyncStatus() {
    try {
      const status = await window.tallyAPI.getSyncStatus();
      this.updateSyncStatus(status);
    } catch (error) {
      console.error("Failed to refresh sync status:", error);
    }
  }

  updateSyncStatus(status) {
    this.syncStatus = status;

    // Update status text and badge
    const statusText = document.getElementById("sync-status-text");
    const statusBadge = statusText.className
      .split(" ")
      .find((cls) => cls.startsWith("bg-"));

    statusText.textContent = status.message;
    statusText.className = statusText.className.replace(statusBadge, "");

    if (status.isRunning) {
      statusText.classList.add("bg-primary");
    } else if (status.error) {
      statusText.classList.add("bg-danger");
    } else {
      statusText.classList.add("bg-success");
    }

    // Update progress bar
    const progressBar = document.getElementById("sync-progress-bar");
    progressBar.style.width = `${status.progress}%`;
    progressBar.setAttribute("aria-valuenow", status.progress);

    // Update current table info
    document.getElementById("current-table").textContent = status.currentTable
      ? `Processing: ${status.currentTable}`
      : "-";

    // Update sync times
    const syncTimes = document.getElementById("sync-times");
    if (syncTimes) {
      let timeText = "";
      if (status.startTime) {
        timeText = `Started: ${new Date(
          status.startTime
        ).toLocaleTimeString()}`;
      }
      if (status.endTime) {
        timeText += ` | Ended: ${new Date(
          status.endTime
        ).toLocaleTimeString()}`;
      }
      syncTimes.textContent = timeText;
    }

    this.updateSyncButtons(status.isRunning);
  }

  onSyncComplete(data) {
    this.updateSyncStatus(data);
    this.showToast("Success", "Sync completed successfully", "success");
    this.updateSyncButtons(false);
  }

  onSyncError(error) {
    this.updateSyncStatus(error);
    this.showToast("Error", error.message || "Sync failed", "error");
    this.updateSyncButtons(false);
  }

  updateSyncButtons(isRunning) {
    document.getElementById("start-sync").disabled = isRunning;
    document.getElementById("stop-sync").disabled = !isRunning;
  }

  updateConnectionStatus(type, status) {
    const statusIndicator = document.getElementById("connection-status");
    const icon = statusIndicator.querySelector("i");

    if (status === "online") {
      statusIndicator.className = "badge bg-success";
      icon.className = "bi bi-circle-fill";
      statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Connected';
    } else if (status === "offline") {
      statusIndicator.className = "badge bg-danger";
      icon.className = "bi bi-circle-fill";
      statusIndicator.innerHTML = '<i class="bi bi-circle-fill"></i> Offline';
    } else if (status === "testing") {
      statusIndicator.className = "badge bg-warning";
      icon.className = "bi bi-circle-fill pulse";
      statusIndicator.innerHTML =
        '<i class="bi bi-circle-fill pulse"></i> Testing';
    }
  }

  addLogMessage(message) {
    const logContainer = document.getElementById("log-container");
    const logLine = document.createElement("div");
    logLine.className = "log-line";

    const timestamp = new Date().toLocaleTimeString();
    logLine.innerHTML = `<span class="text-muted">[${timestamp}]</span> ${this.formatLogMessage(
      message
    )}`;

    logContainer.appendChild(logLine);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep only last 100 log lines for performance
    if (logContainer.children.length > 100) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }

  formatLogMessage(message) {
    if (message.toLowerCase().includes("error")) {
      return `<span class="log-error">${message}</span>`;
    } else if (message.toLowerCase().includes("warning")) {
      return `<span class="log-warning">${message}</span>`;
    } else if (
      message.toLowerCase().includes("success") ||
      message.toLowerCase().includes("completed")
    ) {
      return `<span class="log-success">${message}</span>`;
    } else if (
      message.toLowerCase().includes("info") ||
      message.toLowerCase().includes("syncing")
    ) {
      return `<span class="log-info">${message}</span>`;
    }
    return message;
  }

  async clearLogs() {
    try {
      await window.tallyAPI.clearLogs();
      document.getElementById("log-container").innerHTML =
        '<div class="text-muted">Logs cleared...</div>';
      this.showToast("Success", "Logs cleared", "success");
    } catch (error) {
      this.showToast("Error", "Failed to clear logs", "error");
    }
  }

  async viewDatabaseStructure() {
    try {
      const structure = await window.tallyAPI.getDatabaseStructure();
      document.getElementById("database-structure-content").textContent =
        structure;

      const modal = new bootstrap.Modal(
        document.getElementById("database-structure-modal")
      );
      modal.show();
    } catch (error) {
      this.showToast("Error", "Failed to load database structure", "error");
    }
  }

  async exportConfiguration() {
    try {
      const config = this.getConfigFromForm();
      const filePath = await window.tallyAPI.saveFile({
        title: "Export Configuration",
        defaultPath: "tally-config.json",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (filePath) {
        // Save the configuration to the selected file
        await this.saveConfigToFile(filePath, config);
        this.showToast(
          "Success",
          "Configuration exported successfully",
          "success"
        );
      }
    } catch (error) {
      this.showToast("Error", "Failed to export configuration", "error");
    }
  }

  async importConfiguration() {
    try {
      const filePath = await window.tallyAPI.selectFile({
        title: "Import Configuration",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (filePath) {
        const config = await this.loadConfigFromFile(filePath);
        this.config = config;
        this.populateFormFromConfig();
        this.showToast(
          "Success",
          "Configuration imported successfully",
          "success"
        );
      }
    } catch (error) {
      this.showToast("Error", "Failed to import configuration", "error");
    }
  }

  handleMenuAction(action) {
    switch (action) {
      case "menu-new-configuration":
        this.newConfiguration();
        break;
      case "menu-save-configuration":
        this.saveConfiguration();
        break;
      case "menu-start-sync":
        this.startSync();
        break;
      case "menu-stop-sync":
        this.stopSync();
        break;
      case "menu-test-database":
        this.testDatabaseConnection();
        break;
      case "menu-test-tally":
        this.testTallyConnection();
        break;
      case "menu-clear-logs":
        this.clearLogs();
        break;
      case "menu-database-structure":
        this.viewDatabaseStructure();
        break;
    }
  }

  newConfiguration() {
    // Reset form to default values
    this.config = null;
    document.querySelectorAll("form").forEach((form) => form.reset());
    this.onDatabaseTechnologyChange();
    this.onSyncModeChange();
    this.onDateRangeChange();
    this.showToast("Info", "New configuration created", "info");
  }

  updateUI() {
    // Perform any additional UI updates
    this.onDatabaseTechnologyChange();
    this.onSyncModeChange();
    this.onDateRangeChange();
    this.onSSHToggle();
  }

  showToast(title, message, type = "info") {
    const toastContainer = document.getElementById("toast-container");
    const toastId = `toast-${Date.now()}`;

    const bgClass =
      {
        success: "bg-success",
        error: "bg-danger",
        warning: "bg-warning",
        info: "bg-info",
      }[type] || "bg-info";

    const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" data-bs-autohide="true" data-bs-delay="5000">
                <div class="toast-header ${bgClass} text-white">
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

    toastContainer.insertAdjacentHTML("beforeend", toastHTML);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();

    // Remove toast element after it's hidden
    toastElement.addEventListener("hidden.bs.toast", () => {
      toastElement.remove();
    });
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TallyDatabaseApp();
});
