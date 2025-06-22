// Tally Database Loader - Renderer Application

class TallyDatabaseApp {
  constructor() {
    // Prevent multiple initializations
    if (window.tallyDatabaseAppInstance) {
      return window.tallyDatabaseAppInstance;
    }

    this.config = null;
    this.syncStatus = {
      isRunning: false,
      progress: 0,
      currentTable: "",
      message: "Ready",
    };

    // Flag to prevent duplicate event listeners
    this.initialized = false;

    this.init();

    // Store instance globally to prevent multiple instances
    window.tallyDatabaseAppInstance = this;
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.loadAppVersion();
      await this.loadConfiguration();
      await this.loadStartupSettings();
      this.setupEventListeners();
      this.setupIPCListeners();
      this.updateUI();

      this.initialized = true;

      console.log("Tally Database Loader initialized successfully");
    } catch (error) {
      console.error("Initialization error:", error);
      this.showToast("Error", "Failed to initialize application", "error");
    }
  }

  async loadAppVersion() {
    try {
      const version = await window.tallyAPI.getAppVersion();
      const versionElement = document.getElementById("app-version");
      if (versionElement) {
        versionElement.textContent = `v${version}`;
      }
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
    // Visual Database selector events
    const dbOptions = document.querySelectorAll(".db-option");
    dbOptions.forEach((option) => {
      option.addEventListener("click", () => {
        dbOptions.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
        document.getElementById("db-technology").value = option.dataset.db;
        this.onDatabaseTechnologyChange();
      });
    });

    // Visual Sync mode selector events
    const modeOptions = document.querySelectorAll(".mode-option");
    modeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        modeOptions.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
        document.getElementById("sync-mode").value = option.dataset.mode;
        this.onSyncModeChange();
      });
    });

    // Database form events
    document
      .getElementById("db-technology")
      .addEventListener("change", this.onDatabaseTechnologyChange.bind(this));

    // Test Database Connection - ensure only one listener
    const testDbButton = document.getElementById("test-db-connection");
    if (testDbButton && !testDbButton.hasAttribute("data-listener-attached")) {
      testDbButton.setAttribute("data-listener-attached", "true");
      testDbButton.addEventListener(
        "click",
        this.testDatabaseConnection.bind(this)
      );
    }

    // Tally form events
    const testTallyButton = document.getElementById("test-tally-connection");
    if (
      testTallyButton &&
      !testTallyButton.hasAttribute("data-listener-attached")
    ) {
      testTallyButton.setAttribute("data-listener-attached", "true");
      testTallyButton.addEventListener(
        "click",
        this.testTallyConnection.bind(this)
      );
    }

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
    const startSyncButton = document.getElementById("start-sync");
    if (
      startSyncButton &&
      !startSyncButton.hasAttribute("data-listener-attached")
    ) {
      startSyncButton.setAttribute("data-listener-attached", "true");
      startSyncButton.addEventListener("click", this.startSync.bind(this));
    }

    const stopSyncButton = document.getElementById("stop-sync");
    if (
      stopSyncButton &&
      !stopSyncButton.hasAttribute("data-listener-attached")
    ) {
      stopSyncButton.setAttribute("data-listener-attached", "true");
      stopSyncButton.addEventListener("click", this.stopSync.bind(this));
    }

    // Save config buttons - handle both visible and hidden
    const saveConfigButtons = document.querySelectorAll(
      "#save-config, #save-config-hidden"
    );
    saveConfigButtons.forEach((button) => {
      if (!button.hasAttribute("data-listener-attached")) {
        button.setAttribute("data-listener-attached", "true");
        button.addEventListener("click", this.saveConfiguration.bind(this));
      }
    });

    // SSH tunnel toggle
    document
      .getElementById("ssh-enabled")
      .addEventListener("change", this.onSSHToggle.bind(this));

    // Startup settings
    document
      .getElementById("auto-startup")
      .addEventListener("change", this.onStartupToggle.bind(this));

    document
      .getElementById("start-minimized")
      .addEventListener("change", this.onStartMinimizedToggle.bind(this));

    // SSH password toggle
    document.addEventListener("click", (e) => {
      if (e.target.closest(".password-toggle")) {
        const toggle = e.target.closest(".password-toggle");
        const passwordInput = toggle.previousElementSibling;
        const icon = toggle.querySelector("i");

        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          icon.classList.remove("bi-eye");
          icon.classList.add("bi-eye-slash");
        } else {
          passwordInput.type = "password";
          icon.classList.remove("bi-eye-slash");
          icon.classList.add("bi-eye");
        }
      }
    });

    // Advanced options
    document
      .getElementById("export-config")
      .addEventListener("click", this.exportConfiguration.bind(this));
    document
      .getElementById("import-config")
      .addEventListener("click", this.importConfiguration.bind(this));

    // Log actions
    const clearLogsButton = document.getElementById("clear-logs");
    if (
      clearLogsButton &&
      !clearLogsButton.hasAttribute("data-listener-attached")
    ) {
      clearLogsButton.setAttribute("data-listener-attached", "true");
      clearLogsButton.addEventListener("click", this.clearLogs.bind(this));
    }

    // Other actions - handle both visible and hidden buttons
    const viewDbStructureButtons = document.querySelectorAll(
      "#view-database-structure, #view-database-structure-hidden"
    );
    viewDbStructureButtons.forEach((button) => {
      if (!button.hasAttribute("data-listener-attached")) {
        button.setAttribute("data-listener-attached", "true");
        button.addEventListener("click", this.viewDatabaseStructure.bind(this));
      }
    });

    const refreshStatusButtons = document.querySelectorAll(
      "#refresh-status, #refresh-status-hidden"
    );
    refreshStatusButtons.forEach((button) => {
      if (!button.hasAttribute("data-listener-attached")) {
        button.setAttribute("data-listener-attached", "true");
        button.addEventListener("click", this.refreshSyncStatus.bind(this));
      }
    });
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
    this.updateVisualSelectors();
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

    // Show/hide frequency section based on sync mode
    const frequencySection = document.getElementById("frequency-section");
    if (frequencySection) {
      frequencySection.style.display =
        syncMode === "incremental" ? "block" : "none";
    }

    // Update helper text and validation for frequency field
    const frequencyInput = document.getElementById("sync-frequency");
    if (frequencyInput && syncMode === "full") {
      frequencyInput.value = "0";
    }
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

  async onStartupToggle() {
    const enabled = document.getElementById("auto-startup").checked;

    try {
      if (enabled) {
        const result = await window.tallyAPI.enableStartup();
        if (result.success) {
          this.showToast(
            "Success",
            "Auto-start enabled. App will start with Windows.",
            "success"
          );
        } else {
          this.showToast("Error", "Failed to enable auto-start", "error");
          document.getElementById("auto-startup").checked = false;
        }
      } else {
        const result = await window.tallyAPI.disableStartup();
        if (result.success) {
          this.showToast("Success", "Auto-start disabled.", "success");
        } else {
          this.showToast("Error", "Failed to disable auto-start", "error");
          document.getElementById("auto-startup").checked = true;
        }
      }
    } catch (error) {
      console.error("Startup toggle error:", error);
      this.showToast("Error", "Failed to update startup settings", "error");
    }
  }

  async onStartMinimizedToggle() {
    const enabled = document.getElementById("start-minimized").checked;

    try {
      // Save the setting to local storage
      await window.tallyAPI.storeSet("startMinimized", enabled);
      this.showToast(
        "Success",
        `Start minimized ${enabled ? "enabled" : "disabled"}`,
        "success"
      );
    } catch (error) {
      console.error("Start minimized toggle error:", error);
      this.showToast("Error", "Failed to save setting", "error");
    }
  }

  async loadStartupSettings() {
    try {
      // Check if startup is enabled
      const startupResult = await window.tallyAPI.isStartupEnabled();
      document.getElementById("auto-startup").checked = startupResult.enabled;

      // Load start minimized setting
      const startMinimized = await window.tallyAPI.storeGet("startMinimized");
      document.getElementById("start-minimized").checked =
        startMinimized === true;
    } catch (error) {
      console.error("Error loading startup settings:", error);
    }
  }

  async testDatabaseConnection() {
    const button = document.getElementById("test-db-connection");
    if (!button || button.disabled) return;

    const originalText = button.innerHTML;

    try {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';
      button.disabled = true;

      const config = this.getConfigFromForm();

      if (
        !config.database.server ||
        !config.database.schema ||
        !config.database.username
      ) {
        this.showToast(
          "Validation Error",
          "Please fill in all required database fields (Server, Database Name, Username)",
          "error"
        );
        return;
      }

      const result = await window.tallyAPI.testDatabaseConnection(config);
      const statusIndicator = document.getElementById("connectionStatus");

      if (result.success) {
        this.showToast(
          "Database Connection",
          "Connection successful! Database is accessible.",
          "success"
        );
        if (statusIndicator) {
          const statusDot = statusIndicator.querySelector(".status-dot");
          const statusText = statusIndicator.querySelector(".status-text");
          if (statusDot) statusDot.className = "status-dot status-success";
          if (statusText) statusText.textContent = "Database Connected";
        }
      } else {
        this.showToast(
          "Database Connection",
          `Connection failed: ${result.message}`,
          "error"
        );
        if (statusIndicator) {
          const statusDot = statusIndicator.querySelector(".status-dot");
          const statusText = statusIndicator.querySelector(".status-text");
          if (statusDot) statusDot.className = "status-dot status-error";
          if (statusText) statusText.textContent = "Database Error";
        }
      }
    } catch (error) {
      console.error("Database connection test error:", error);
      this.showToast(
        "Database Connection",
        "Connection test failed due to an unexpected error",
        "error"
      );
      const statusIndicator = document.getElementById("connectionStatus");
      if (statusIndicator) {
        const statusDot = statusIndicator.querySelector(".status-dot");
        const statusText = statusIndicator.querySelector(".status-text");
        if (statusDot) statusDot.className = "status-dot status-error";
        if (statusText) statusText.textContent = "Connection Error";
      }
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async testTallyConnection() {
    const button = document.getElementById("test-tally-connection");
    if (!button || button.disabled) return;

    const originalText = button.innerHTML;

    try {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Testing...';
      button.disabled = true;

      const config = this.getConfigFromForm();

      if (!config.tally.server) {
        this.showToast(
          "Validation Error",
          "Please enter Tally server address",
          "error"
        );
        return;
      }

      const result = await window.tallyAPI.testTallyConnection(config);
      const statusIndicator = document.getElementById("connectionStatus");

      if (result.success) {
        this.showToast(
          "Tally Connection",
          "Connection successful! Tally server is accessible.",
          "success"
        );
        if (statusIndicator) {
          const statusDot = statusIndicator.querySelector(".status-dot");
          const statusText = statusIndicator.querySelector(".status-text");
          if (statusDot) statusDot.className = "status-dot status-success";
          if (statusText) statusText.textContent = "Tally Connected";
        }
      } else {
        this.showToast(
          "Tally Connection",
          `Connection failed: ${result.message}`,
          "error"
        );
        if (statusIndicator) {
          const statusDot = statusIndicator.querySelector(".status-dot");
          const statusText = statusIndicator.querySelector(".status-text");
          if (statusDot) statusDot.className = "status-dot status-error";
          if (statusText) statusText.textContent = "Tally Error";
        }
      }
    } catch (error) {
      console.error("Tally connection test error:", error);
      this.showToast(
        "Tally Connection",
        "Connection test failed due to an unexpected error",
        "error"
      );
      const statusIndicator = document.getElementById("connectionStatus");
      if (statusIndicator) {
        const statusDot = statusIndicator.querySelector(".status-dot");
        const statusText = statusIndicator.querySelector(".status-text");
        if (statusDot) statusDot.className = "status-dot status-error";
        if (statusText) statusText.textContent = "Connection Error";
      }
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

    // Update status badge
    const statusBadge = document.querySelector(".status-badge");
    if (statusBadge) {
      statusBadge.textContent = status.message;
      statusBadge.className =
        "status-badge " +
        (status.isRunning
          ? "status-running"
          : status.error
          ? "status-error"
          : "status-ready");
    }

    // Update progress bar
    const progressBar = document.getElementById("progressFill");
    if (progressBar) {
      progressBar.style.width = `${status.progress}%`;
    }

    const progressPercentage = document.querySelector(".progress-percentage");
    if (progressPercentage) {
      progressPercentage.textContent = `${Math.round(status.progress)}%`;
    }

    // Update records count
    const recordsCount = document.getElementById("recordsCount");
    if (recordsCount && status.recordsProcessed) {
      recordsCount.textContent = status.recordsProcessed.toLocaleString();
    }

    // Update elapsed time
    const elapsedTime = document.getElementById("elapsedTime");
    if (elapsedTime && status.startTime) {
      const elapsed = status.endTime
        ? new Date(status.endTime) - new Date(status.startTime)
        : Date.now() - new Date(status.startTime);
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      elapsedTime.textContent = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // Update records per second
    const recordsPerSec = document.getElementById("recordsPerSec");
    if (recordsPerSec && status.recordsPerSecond) {
      recordsPerSec.textContent = Math.round(status.recordsPerSecond);
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

  addLogMessage(message) {
    const logContainer =
      document.getElementById("logsContainer") ||
      document.getElementById("log-container");
    if (!logContainer) return;

    const logLine = document.createElement("div");
    logLine.className = "log-entry log-info";

    const timestamp = new Date().toLocaleTimeString();
    logLine.innerHTML = `<span class="log-timestamp">${timestamp}</span><span class="log-message">${this.formatLogMessage(
      message
    )}</span>`;

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
      const logContainer =
        document.getElementById("logsContainer") ||
        document.getElementById("log-container");
      if (logContainer) {
        logContainer.innerHTML =
          '<div class="log-entry log-info"><span class="log-timestamp">--:--:--</span><span class="log-message">Logs cleared...</span></div>';
      }
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
      default:
        console.warn("Unknown menu action:", action);
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

  updateVisualSelectors() {
    // Update visual database selector to match hidden select
    const dbTechnology = document.getElementById("db-technology").value;
    const dbOptions = document.querySelectorAll(".db-option");
    dbOptions.forEach((option) => {
      option.classList.remove("active");
      if (option.dataset.db === dbTechnology) {
        option.classList.add("active");
      }
    });

    // Update visual sync mode selector to match hidden select
    const syncMode = document.getElementById("sync-mode").value;
    const modeOptions = document.querySelectorAll(".mode-option");
    modeOptions.forEach((option) => {
      option.classList.remove("active");
      if (option.dataset.mode === syncMode) {
        option.classList.add("active");
      }
    });
  }

  updateUI() {
    // Perform any additional UI updates
    this.onDatabaseTechnologyChange();
    this.onSyncModeChange();
    this.onDateRangeChange();
    this.onSSHToggle();
    this.updateVisualSelectors();
  }

  showToast(title, message, type = "info") {
    // Prevent duplicate toasts with the same message
    const existingToasts = document.querySelectorAll(".toast-notification");
    for (let toast of existingToasts) {
      const toastMessage = toast.querySelector("span");
      if (toastMessage && toastMessage.textContent === message) {
        return; // Don't show duplicate toast
      }
    }

    // Use the modern toast system defined in the HTML
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }

    // Fallback to container-based toasts
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;

    const toastId = `toast-${Date.now()}`;
    const iconClass =
      {
        success: "bi-check-circle",
        error: "bi-x-circle",
        warning: "bi-exclamation-triangle",
        info: "bi-info-circle",
      }[type] || "bi-info-circle";

    const toastHTML = `
      <div class="toast-notification toast-${type}" id="${toastId}">
        <i class="bi ${iconClass}"></i>
        <span>${message}</span>
        <button class="toast-close"><i class="bi bi-x"></i></button>
      </div>
    `;

    toastContainer.insertAdjacentHTML("beforeend", toastHTML);

    const toastElement = document.getElementById(toastId);
    setTimeout(() => toastElement.classList.add("show"), 100);

    // Add close functionality
    const closeButton = toastElement.querySelector(".toast-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        toastElement.classList.remove("show");
        setTimeout(() => toastElement.remove(), 300);
      });
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toastElement && toastElement.parentNode) {
        toastElement.classList.remove("show");
        setTimeout(() => toastElement.remove(), 300);
      }
    }, 5000);
  }
}

// Application class is now initialized from index.html after all resources are loaded
