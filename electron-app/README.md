# Tally Database Loader - Desktop Application

A standalone Windows desktop application that wraps the Tally Database Loader Node.js utility into a user-friendly GUI application with an installer.

## Features

- **Intuitive GUI Interface**: Modern, responsive web-based UI using HTML/CSS/JavaScript
- **Database Support**: SQL Server, PostgreSQL, MySQL, MariaDB, BigQuery
- **Sync Modes**: Full sync and incremental sync capabilities
- **SSH Tunnel Support**: Secure database connections through SSH tunnels
- **Real-time Monitoring**: Live sync progress tracking and logging
- **Configuration Management**: Save, load, import, and export configurations
- **Windows Integration**: Native Windows application with system tray support
- **Auto-updates**: Built-in update mechanism for seamless upgrades

## Prerequisites

- Windows 10 or Windows 11
- No external Node.js installation required (bundled within the application)

## Development Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd electron-app
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Development mode**:

   ```bash
   npm run dev
   ```

4. **Build the application**:

   ```bash
   npm run build
   ```

5. **Start the application**:
   ```bash
   npm start
   ```

## Building for Production

### Build for Windows (x64 and x86)

```bash
npm run dist:win
```

### Build for all platforms

```bash
npm run dist:all
```

### Create installer packages

```bash
npm run pack
```

This will create:

- **NSIS installer** (.exe) - for easy installation
- **MSI installer** (.msi) - for enterprise deployment

## Project Structure

```
electron-app/
├── src/
│   ├── main.ts           # Electron main process
│   ├── preload.ts        # Preload script for secure IPC
│   ├── core-bridge.ts    # Bridge to tally-database-loader
│   ├── renderer/         # GUI frontend
│   │   ├── index.html    # Main UI layout
│   │   ├── app.js        # Application logic
│   │   └── styles.css    # Custom styles
│   └── assets/           # Icons and images
├── core/                 # Integrated tally-database-loader
├── dist/                 # Compiled TypeScript output
├── build/                # Built application packages
├── package.json          # Dependencies and build scripts
└── tsconfig.json         # TypeScript configuration
```

## Configuration

The application uses a JSON configuration file that contains:

### Database Configuration

- **Technology**: mysql, mssql, postgres, bigquery, adls, csv
- **Connection Details**: server, port, credentials
- **SSH Tunnel**: optional secure connection settings
- **Load Method**: insert or bulk load

### Tally Configuration

- **Server Details**: Tally server host and port
- **Company Selection**: specific company or auto-detect
- **Sync Settings**: full or incremental sync
- **Date Range**: financial year or custom dates
- **Frequency**: one-time or scheduled sync

## Usage Guide

### First Time Setup

1. **Launch the application**
2. **Configure Database Connection**:

   - Select database technology
   - Enter connection details
   - Test connection
   - Configure SSH tunnel if needed

3. **Configure Tally Connection**:

   - Enter Tally server details
   - Test connection
   - Load and select company
   - Choose sync mode and frequency

4. **Advanced Settings**:

   - Select definition file
   - Configure performance options
   - Set up backup and restore

5. **Start Sync**:
   - Save configuration
   - Click "Start Sync"
   - Monitor progress in real-time

### Daily Operations

- **Monitor Sync Status**: Real-time progress tracking
- **View Logs**: Detailed operation logs with filtering
- **Quick Actions**: Save/load configurations, test connections
- **Database Tools**: View structure, run reports

## Architecture

### Main Process (`main.ts`)

- Application lifecycle management
- Window creation and management
- Menu system and shortcuts
- IPC communication handling
- Auto-updater integration

### Renderer Process (`renderer/`)

- User interface rendering
- Form handling and validation
- Real-time status updates
- Configuration management
- User interactions

### Core Bridge (`core-bridge.ts`)

- Integration with tally-database-loader
- Process management and communication
- Configuration file handling
- Error handling and logging

### Security

- **Context Isolation**: Secure communication between processes
- **No Node Integration**: Renderer process runs in sandboxed environment
- **Preload Script**: Controlled API exposure
- **Credential Storage**: Secure storage using electron-store

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Verify server details and credentials
   - Check network connectivity
   - Test SSH tunnel configuration

2. **Tally Connection Failed**

   - Ensure Tally Prime is running
   - Verify port 9000 is accessible
   - Check firewall settings

3. **Sync Errors**

   - Review error logs
   - Check database permissions
   - Verify Tally company access

4. **Application Won't Start**
   - Check Windows version compatibility
   - Run as administrator if needed
   - Review installation logs

### Log Files

- **Application Logs**: `%APPDATA%/tally-database-loader-app/logs/`
- **Import Logs**: `%APPDATA%/tally-database-loader-app/import-log.txt`
- **Error Logs**: `%APPDATA%/tally-database-loader-app/error-log.txt`

## Support

For technical support and bug reports:

1. Check the troubleshooting section
2. Review log files for detailed error information
3. Submit issues with configuration and log details

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### Version 1.0.0

- Initial release
- Complete GUI interface
- Windows installer support
- Full sync and incremental sync
- SSH tunnel support
- Real-time monitoring
- Configuration management
