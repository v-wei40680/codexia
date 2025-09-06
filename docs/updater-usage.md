# Updater Usage Guide

The updater system allows your Tauri application to automatically check for and install updates from GitHub releases.

## How It Works

1. **Configuration**: The updater is configured in `tauri.conf.json` to check GitHub releases
2. **Update Check**: The app checks for updates using the Tauri updater plugin
3. **Download & Install**: If an update is available, it can be downloaded and installed
4. **Restart**: The app automatically restarts after installation

## Components

### 1. UpdaterService (`src/components/updater.ts`)

A singleton service that handles all update operations:

```typescript
import { updater } from '@/components/updater';

// Check for updates
const updateInfo = await updater.checkForUpdates();

// Download and install update
const success = await updater.downloadAndInstall((progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});
```

### 2. UpdaterComponent (`src/components/UpdaterComponent.tsx`)

A complete React component with UI for update management:

```tsx
import UpdaterComponent from '@/components/UpdaterComponent';

function MyApp() {
  return (
    <div>
      <UpdaterComponent />
    </div>
  );
}
```

### 3. useUpdater Hook (`src/hooks/useUpdater.ts`)

A React hook for custom update logic:

```tsx
import { useUpdater } from '@/hooks/useUpdater';

function MyComponent() {
  const {
    updateInfo,
    isChecking,
    isDownloading,
    progress,
    error,
    checkForUpdates,
    downloadAndInstall
  } = useUpdater();

  return (
    <div>
      {updateInfo && (
        <button onClick={downloadAndInstall}>
          Update to {updateInfo.version}
        </button>
      )}
    </div>
  );
}
```

## Integration

The updater is already integrated into the Settings page under the "Updates" section. Users can:

1. **Check for Updates**: Click "Check for Updates" to manually check
2. **View Update Info**: See version, date, and release notes
3. **Download & Install**: Click the download button to install updates
4. **Monitor Progress**: See download progress with a progress bar

## Configuration

The updater is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "your-public-key",
      "endpoints": [
        "https://github.com/milisp/codexia/releases/download/{{version}}/updater.json"
      ]
    }
  },
  "bundle": {
    "createUpdaterArtifacts": true
  }
}
```

## Release Process

To create an update:

1. **Build the app** with `bun run build`
2. **Create a GitHub release** with the new version
3. **Upload the updater artifacts** (generated in `src-tauri/target/release/bundle/`)
4. **The updater.json file** will be automatically created

## Features

- ✅ Automatic update checking
- ✅ Progress tracking during download
- ✅ Error handling
- ✅ Release notes display
- ✅ Manual check for updates
- ✅ Beautiful UI with shadcn components
- ✅ TypeScript support
- ✅ React hooks for custom integration

## Error Handling

The updater handles various error scenarios:

- Network failures during update check
- Download failures
- Installation failures
- Invalid update signatures

All errors are displayed to the user with appropriate messages.

## Security

Updates are cryptographically signed using the public key in the configuration. Only updates signed with the corresponding private key will be installed.
