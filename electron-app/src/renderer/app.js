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
      await this.loadInitialConfiguration();
      await this.loadStartupSettings();
      this.setupEventListeners();
      this.setupIPCListeners();
      this.updateUI();

      // Update the configuration status after initialization
      this.updateConfigurationStatus();

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

  async loadInitialConfiguration() {
    try {
      this.config = await window.tallyAPI.loadConfig();
      this.populateFormFromConfig();
      console.log("Initial configuration loaded successfully");

      // Update the configuration status after initial loading
      this.updateConfigurationStatus();
    } catch (error) {
      console.error("Failed to load initial configuration:", error);
      // Don't show error toast during initialization, just log it
      // The core will create a default configuration if none exists
    }
  }

  async loadConfiguration() {
    try {
      // Check if there are unsaved changes
      if (this.isConfigurationModified()) {
        const result = await window.tallyAPI.showMessageBox({
          type: "question",
          title: "Unsaved Changes",
          message:
            "You have unsaved changes. Do you want to load the saved configuration and discard your changes?",
          buttons: ["Yes", "No"],
          defaultId: 1,
        });

        if (result.response === 1) {
          // User chose "No"
          return;
        }
      }

      this.config = await window.tallyAPI.loadConfig();
      this.populateFormFromConfig();
      console.log("Configuration loaded successfully");
      this.showToast("Success", "Configuration loaded successfully", "success");

      // Update the configuration status after loading
      this.updateConfigurationStatus();
    } catch (error) {
      console.error("Failed to load configuration:", error);
      this.showToast("Error", "Failed to load configuration", "error");
    }
  }

  async refreshConfiguration() {
    try {
      await this.loadConfiguration();
    } catch (error) {
      console.error("Failed to refresh configuration:", error);
    }
  }

  async resetConfiguration() {
    try {
      // Reset form to default values
      this.config = null;
      document.querySelectorAll("form").forEach((form) => form.reset());

      // Set default values
      document.getElementById("db-technology").value = "mysql";
      document.getElementById("db-port").value = "3306";
      document.getElementById("db-ssl").checked = false;
      document.getElementById("db-load-method").value = "insert";

      document.getElementById("tally-server").value = "localhost";
      document.getElementById("tally-port").value = "9000";
      document.getElementById("sync-mode").value = "full";
      document.getElementById("sync-frequency").value = "0";
      document.getElementById("definition-file").value =
        "tally-export-config.yaml";

      document.getElementById("date-auto").checked = true;
      document.getElementById("ssh-enabled").checked = false;

      // Update UI
      this.onDatabaseTechnologyChange();
      this.onSyncModeChange();
      this.onDateRangeChange();
      this.onSSHToggle();
      this.updateVisualSelectors();

      // Update the configuration status after resetting
      this.updateConfigurationStatus();

      this.showToast("Info", "Configuration reset to default values", "info");
    } catch (error) {
      console.error("Failed to reset configuration:", error);
      this.showToast("Error", "Failed to reset configuration", "error");
    }
  }

  isConfigurationModified() {
    if (!this.config) {
      return false; // If no config is loaded yet, don't consider it modified
    }

    try {
      const currentConfig = this.getConfigFromForm();
      return JSON.stringify(currentConfig) !== JSON.stringify(this.config);
    } catch (error) {
      console.error("Error checking configuration modification:", error);
      return false; // Assume not modified if there's an error
    }
  }

  onConfigurationChange() {
    // This method is called whenever the configuration changes
    // You can add auto-save functionality here if needed
    console.log("Configuration changed");

    // Update the configuration status in the UI
    this.updateConfigurationStatus();

    // Optionally, you can enable auto-save by uncommenting the following line:
    // this.autoSaveConfiguration();
  }

  async autoSaveConfiguration() {
    try {
      if (this.isConfigurationModified()) {
        await this.saveConfiguration();
        console.log("Configuration auto-saved");
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }

  updateConfigurationStatus() {
    // Update UI to show configuration status
    const isModified = this.isConfigurationModified();
    const saveButton = document.getElementById("save-config");

    if (saveButton) {
      if (isModified) {
        saveButton.classList.add("modified");
        saveButton.title = "Save Configuration (Modified)";
      } else {
        saveButton.classList.remove("modified");
        saveButton.title = "Save Configuration";
      }
    }

    // You can add more UI indicators here
    console.log("Configuration status updated - Modified:", isModified);
  }

  showConfigurationSummary() {
    try {
      const currentConfig = this.getConfigFromForm();
      const summary = {
        database: {
          technology: currentConfig.database.technology,
          server: currentConfig.database.server,
          schema: currentConfig.database.schema,
          sshEnabled: currentConfig.database.ssh_tunnel?.enabled || false,
        },
        tally: {
          server: currentConfig.tally.server,
          company: currentConfig.tally.company,
          syncMode: currentConfig.tally.sync,
          frequency: currentConfig.tally.frequency,
        },
      };

      const message = `Database: ${summary.database.technology} (${
        summary.database.server
      }/${summary.database.schema})
Tally: ${summary.tally.server} - ${
        summary.tally.company || "No company selected"
      }
Sync: ${summary.tally.sync}${
        summary.tally.frequency > 0 ? ` (${summary.tally.frequency} min)` : ""
      }
SSH: ${summary.database.sshEnabled ? "Enabled" : "Disabled"}`;

      this.showToast("Configuration Summary", message, "info");
    } catch (error) {
      console.error("Error showing configuration summary:", error);
      this.showToast("Error", "Failed to show configuration summary", "error");
    }
  }

  async saveConfiguration() {
    try {
      this.config = this.getConfigFromForm();

      // Validate configuration
      // const validation = await window.tallyAPI.validateConfig(this.config);
      // if (!validation.isValid) {
      //   const errorMessage =
      //     validation.errors.length > 1
      //       ? `Multiple validation errors:\n${validation.errors.join("\n")}`
      //       : validation.errors[0];

      //   this.showToast("Validation Error", errorMessage, "error");
      //   return false;
      // }

      await window.tallyAPI.saveConfig(this.config);
      this.showToast("Success", "Configuration saved successfully", "success");
      console.log("Configuration saved successfully:", this.config);

      // Update the configuration status after saving
      this.updateConfigurationStatus();

      return true;
    } catch (error) {
      console.error("Failed to save configuration:", error);
      this.showToast("Error", "Failed to save configuration", "error");
      return false;
    }
  }

  async validateCurrentConfiguration() {
    try {
      const currentConfig = this.getConfigFromForm();
      const validation = await window.tallyAPI.validateConfig(currentConfig);

      if (validation.isValid) {
        this.showToast("Validation", "Configuration is valid", "success");
      } else {
        const errorMessage =
          validation.errors.length > 1
            ? `Validation errors:\n${validation.errors.join("\n")}`
            : validation.errors[0];

        this.showToast("Validation Error", errorMessage, "error");
      }

      return validation.isValid;
    } catch (error) {
      console.error("Failed to validate configuration:", error);
      this.showToast("Error", "Failed to validate configuration", "error");
      return false;
    }
  }

  async restoreConfigurationFromBackup() {
    try {
      const backupPath = await window.tallyAPI.selectFile({
        title: "Select Backup Configuration File",
        filters: [
          { name: "Backup Files", extensions: ["backup.*", "json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (backupPath) {
        const success = await window.tallyAPI.restoreConfig(backupPath);

        if (success) {
          // Reload the configuration after restoration
          await this.loadConfiguration();
          this.showToast(
            "Success",
            "Configuration restored from backup successfully",
            "success"
          );
        } else {
          this.showToast(
            "Error",
            "Failed to restore configuration from backup",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Failed to restore configuration from backup:", error);
      this.showToast(
        "Error",
        "Failed to restore configuration from backup",
        "error"
      );
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
        this.onConfigurationChange();
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
        this.onConfigurationChange();
      });
    });

    // Database form events
    document.getElementById("db-technology").addEventListener("change", () => {
      this.onDatabaseTechnologyChange();
      this.onConfigurationChange();
    });

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
    document.getElementById("sync-mode").addEventListener("change", () => {
      this.onSyncModeChange();
      this.onConfigurationChange();
    });

    // Date range events
    document.querySelectorAll('input[name="date-range"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        this.onDateRangeChange();
        this.onConfigurationChange();
      });
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

    // Load config buttons - handle both visible and hidden
    const loadConfigButtons = document.querySelectorAll(
      "#load-config, #load-config-hidden"
    );
    loadConfigButtons.forEach((button) => {
      if (!button.hasAttribute("data-listener-attached")) {
        button.setAttribute("data-listener-attached", "true");
        button.addEventListener("click", this.loadConfiguration.bind(this));
      }
    });

    // SSH tunnel toggle
    document.getElementById("ssh-enabled").addEventListener("change", () => {
      this.onSSHToggle();
      this.onConfigurationChange();
    });

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

    // Add change listeners to all form inputs for configuration change detection
    const formInputs = document.querySelectorAll(
      "input[type='text'], input[type='number'], input[type='password'], select, textarea"
    );
    formInputs.forEach((input) => {
      input.addEventListener("change", this.onConfigurationChange.bind(this));
      input.addEventListener("input", this.onConfigurationChange.bind(this));
    });

    // Add change listeners to checkboxes and radio buttons
    const formCheckboxes = document.querySelectorAll(
      "input[type='checkbox'], input[type='radio']"
    );
    formCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener(
        "change",
        this.onConfigurationChange.bind(this)
      );
    });

    // Add beforeunload event listener to warn about unsaved changes
    window.addEventListener("beforeunload", (event) => {
      if (this.isConfigurationModified()) {
        event.preventDefault();
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return event.returnValue;
      }
    });

    // Add window focus event listener to refresh configuration status
    window.addEventListener("focus", () => {
      this.updateConfigurationStatus();
    });

    // Add keyboard shortcuts
    document.addEventListener("keydown", (event) => {
      // Ctrl+S for save
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        this.saveConfiguration();
      }

      // Ctrl+O for load
      if (event.ctrlKey && event.key === "o") {
        event.preventDefault();
        this.loadConfiguration();
      }

      // Ctrl+N for new configuration
      if (event.ctrlKey && event.key === "n") {
        event.preventDefault();
        this.newConfiguration();
      }

      // Ctrl+I for configuration summary
      if (event.ctrlKey && event.key === "i") {
        event.preventDefault();
        this.showConfigurationSummary();
      }

      // Ctrl+V for validate configuration
      if (event.ctrlKey && event.key === "v") {
        event.preventDefault();
        this.validateCurrentConfiguration();
      }

      // Ctrl+R for restore configuration from backup
      if (event.ctrlKey && event.key === "r") {
        event.preventDefault();
        this.restoreConfigurationFromBackup();
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
    if (!this.config) {
      console.warn("No configuration to populate");
      return;
    }

    try {
      // Database configuration
      const db = this.config.database || {};
      const dbTechnologyElement = document.getElementById("db-technology");
      const dbServerElement = document.getElementById("db-server");
      const dbPortElement = document.getElementById("db-port");
      const dbSchemaElement = document.getElementById("db-schema");
      const dbUsernameElement = document.getElementById("db-username");
      const dbPasswordElement = document.getElementById("db-password");
      const dbSslElement = document.getElementById("db-ssl");
      const dbLoadMethodElement = document.getElementById("db-load-method");

      if (dbTechnologyElement)
        dbTechnologyElement.value = db.technology || "mysql";
      if (dbServerElement) dbServerElement.value = db.server || "";
      if (dbPortElement) dbPortElement.value = db.port || 3306;
      if (dbSchemaElement) dbSchemaElement.value = db.schema || "";
      if (dbUsernameElement) dbUsernameElement.value = db.username || "";
      if (dbPasswordElement) dbPasswordElement.value = db.password || "";
      if (dbSslElement) dbSslElement.checked = db.ssl || false;
      if (dbLoadMethodElement)
        dbLoadMethodElement.value = db.loadmethod || "insert";

      // SSH tunnel configuration
      if (db.ssh_tunnel) {
        const sshEnabledElement = document.getElementById("ssh-enabled");
        const sshHostElement = document.getElementById("ssh-host");
        const sshPortElement = document.getElementById("ssh-port");
        const sshUsernameElement = document.getElementById("ssh-username");
        const sshPasswordElement = document.getElementById("ssh-password");
        const sshPrivateKeyElement = document.getElementById("ssh-private-key");
        const sshLocalPortElement = document.getElementById("ssh-local-port");
        const sshRemoteHostElement = document.getElementById("ssh-remote-host");
        const sshRemotePortElement = document.getElementById("ssh-remote-port");

        if (sshEnabledElement)
          sshEnabledElement.checked = db.ssh_tunnel.enabled || false;
        if (sshHostElement) sshHostElement.value = db.ssh_tunnel.host || "";
        if (sshPortElement) sshPortElement.value = db.ssh_tunnel.port || 22;
        if (sshUsernameElement)
          sshUsernameElement.value = db.ssh_tunnel.username || "";
        if (sshPasswordElement)
          sshPasswordElement.value = db.ssh_tunnel.password || "";
        if (sshPrivateKeyElement)
          sshPrivateKeyElement.value = db.ssh_tunnel.privateKey || "";
        if (sshLocalPortElement)
          sshLocalPortElement.value = db.ssh_tunnel.localPort || 3307;
        if (sshRemoteHostElement)
          sshRemoteHostElement.value = db.ssh_tunnel.remoteHost || "localhost";
        if (sshRemotePortElement)
          sshRemotePortElement.value = db.ssh_tunnel.remotePort || 3306;

        this.onSSHToggle();
      }

      // Tally configuration
      const tally = this.config.tally || {};
      const tallyServerElement = document.getElementById("tally-server");
      const tallyPortElement = document.getElementById("tally-port");
      const tallyCompanyElement = document.getElementById("tally-company");
      const syncModeElement = document.getElementById("sync-mode");
      const syncFrequencyElement = document.getElementById("sync-frequency");
      const definitionFileElement = document.getElementById("definition-file");

      if (tallyServerElement)
        tallyServerElement.value = tally.server || "localhost";
      if (tallyPortElement) tallyPortElement.value = tally.port || 9000;
      if (tallyCompanyElement) tallyCompanyElement.value = tally.company || "";
      if (syncModeElement) syncModeElement.value = tally.sync || "full";
      if (syncFrequencyElement)
        syncFrequencyElement.value = tally.frequency || 0;
      if (definitionFileElement)
        definitionFileElement.value =
          tally.definition || "tally-export-config.yaml";

      // Date range
      const dateAutoElement = document.getElementById("date-auto");
      const dateCustomElement = document.getElementById("date-custom");
      const fromDateElement = document.getElementById("from-date");
      const toDateElement = document.getElementById("to-date");

      if (tally.fromdate === "auto" || tally.todate === "auto") {
        if (dateAutoElement) dateAutoElement.checked = true;
      } else {
        if (dateCustomElement) dateCustomElement.checked = true;
        if (fromDateElement) fromDateElement.value = tally.fromdate || "";
        if (toDateElement) toDateElement.value = tally.todate || "";
      }

      // Update UI components
      this.onDatabaseTechnologyChange();
      this.onSyncModeChange();
      this.onDateRangeChange();
      this.updateVisualSelectors();

      console.log("Form populated from configuration successfully");

      // Update the configuration status after populating
      this.updateConfigurationStatus();
    } catch (error) {
      console.error("Error populating form from configuration:", error);
      this.showToast(
        "Warning",
        "Some configuration fields could not be loaded",
        "warning"
      );
    }
  }

  getConfigFromForm() {
    try {
      const config = {
        database: {
          technology:
            document.getElementById("db-technology")?.value || "mysql",
          server: document.getElementById("db-server")?.value || "",
          port: parseInt(document.getElementById("db-port")?.value) || 3306,
          ssl: document.getElementById("db-ssl")?.checked || false,
          schema: document.getElementById("db-schema")?.value || "",
          username: document.getElementById("db-username")?.value || "",
          password: document.getElementById("db-password")?.value || "",
          loadmethod:
            document.getElementById("db-load-method")?.value || "insert",
          ssh_tunnel: document.getElementById("ssh-enabled")?.checked
            ? {
                enabled: true,
                host: document.getElementById("ssh-host")?.value || "",
                port:
                  parseInt(document.getElementById("ssh-port")?.value) || 22,
                username: document.getElementById("ssh-username")?.value || "",
                password: document.getElementById("ssh-password")?.value || "",
                privateKey:
                  document.getElementById("ssh-private-key")?.value || "",
                localPort:
                  parseInt(document.getElementById("ssh-local-port")?.value) ||
                  3307,
                remoteHost:
                  document.getElementById("ssh-remote-host")?.value ||
                  "localhost",
                remotePort:
                  parseInt(document.getElementById("ssh-remote-port")?.value) ||
                  3306,
              }
            : { enabled: false },
        },
        tally: {
          definition:
            document.getElementById("definition-file")?.value ||
            "tally-export-config.yaml",
          server: document.getElementById("tally-server")?.value || "localhost",
          port: parseInt(document.getElementById("tally-port")?.value) || 9000,
          company: document.getElementById("tally-company")?.value || "",
          fromdate: document.getElementById("date-auto")?.checked
            ? "auto"
            : document.getElementById("from-date")?.value || "",
          todate: document.getElementById("date-auto")?.checked
            ? "auto"
            : document.getElementById("to-date")?.value || "",
          sync: document.getElementById("sync-mode")?.value || "full",
          frequency:
            parseInt(document.getElementById("sync-frequency")?.value) || 0,
        },
      };

      console.log("Configuration captured from form:", config);
      return config;
    } catch (error) {
      console.error("Error capturing configuration from form:", error);
      throw new Error("Failed to capture configuration from form");
    }
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
      // Check if sync is already running
      const isRunning = await window.tallyAPI.isSyncRunning();
      if (isRunning) {
        this.showToast("Info", "Sync is already running", "info");
        return;
      }

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

      const result = await window.tallyAPI.startSync(config);

      // Check if there's an error response (e.g., sync already running)
      if (result && result.error) {
        this.showToast("Info", result.error, "info");
        return;
      }

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
    const startButton = document.getElementById("start-sync");
    const stopButton = document.getElementById("stop-sync");

    if (startButton) {
      startButton.disabled = isRunning;
      const icon = startButton.querySelector("i");
      const textSpan = startButton.querySelector("span");

      if (isRunning) {
        if (icon) icon.className = "bi bi-pause-fill";
        if (textSpan) textSpan.textContent = "Sync Running...";
      } else {
        if (icon) icon.className = "bi bi-play-fill";
        if (textSpan) textSpan.textContent = "Start Synchronization";
      }
    }

    if (stopButton) {
      stopButton.disabled = !isRunning;
    }
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

  async saveConfigToFile(filePath, config) {
    try {
      const response = await fetch(filePath, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config, null, 2),
      });

      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`);
      }
    } catch (error) {
      // Fallback: try to write using Node.js fs module through IPC
      try {
        await window.tallyAPI.writeFile(
          filePath,
          JSON.stringify(config, null, 2)
        );
      } catch (fsError) {
        throw new Error(`Failed to save configuration file: ${error.message}`);
      }
    }
  }

  async loadConfigFromFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }
      const configText = await response.text();
      return JSON.parse(configText);
    } catch (error) {
      // Fallback: try to read using Node.js fs module through IPC
      try {
        const configText = await window.tallyAPI.readFile(filePath);
        return JSON.parse(configText);
      } catch (fsError) {
        throw new Error(`Failed to load configuration file: ${error.message}`);
      }
    }
  }

  handleMenuAction(action) {
    switch (action) {
      case "menu-new-configuration":
        this.newConfiguration();
        break;
      case "menu-open-configuration":
        this.loadConfiguration();
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

  async newConfiguration() {
    try {
      // Check if there are unsaved changes
      if (this.isConfigurationModified()) {
        const result = await window.tallyAPI.showMessageBox({
          type: "question",
          title: "Unsaved Changes",
          message:
            "You have unsaved changes. Do you want to create a new configuration and discard your changes?",
          buttons: ["Yes", "No"],
          defaultId: 1,
        });

        if (result.response === 1) {
          // User chose "No"
          return;
        }
      }

      // Reset form to default values using the reset method
      this.resetConfiguration();
    } catch (error) {
      console.error("Failed to create new configuration:", error);
      this.showToast("Error", "Failed to create new configuration", "error");
    }
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
