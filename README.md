# Personal Use

# Spotify Controller for GitHub Pages

A simple web-based Spotify controller that works with the Spotify Web API to control your music playback from any browser. Perfect for repurposing old tablets as dedicated music controllers.

## Features

- Control Spotify playback (play, pause, next, previous)
- View currently playing track with album art
- Secure client ID management (never stored in the repository)
- Responsive design that works on any device

## Setup Instructions

### Step 1: Create a Spotify Developer Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in the app name (e.g., "My Spotify Controller") and description
5. Check the agreement checkbox and click "Create"

### Step 2: Configure Your Application

1. In your new Spotify app dashboard, click "Edit Settings"
2. Add your GitHub Pages URL as a Redirect URI:
   - Format: `https://yourusername.github.io/spotify-controller/`
   - Click "Add" and then "Save"
3. Note your **Client ID** (you'll need it later)

### Step 3: Deploy to GitHub Pages

1. Create a new repository on GitHub named `spotify-controller`
2. Upload the `index.html` file from this project to your repository
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" under Source
5. Choose your main branch and click "Save"
6. Wait a few minutes for GitHub to deploy your site

### Step 4: Connect Your Controller

**Option 1: URL Parameter Method**
1. Navigate to your controller using this format:
   ```
   https://yourusername.github.io/spotify-controller/#client_id=YOUR_CLIENT_ID
   ```
2. Replace `YOUR_CLIENT_ID` with the actual Client ID from your Spotify Developer Dashboard
3. Bookmark this URL for easy access

**Option 2: Manual Entry Method**
1. Visit your GitHub Pages URL: `https://yourusername.github.io/spotify-controller/`
2. Enter your Client ID in the input field
3. Click "Save Client ID"

### Step 5: Authorize and Use

1. After providing your Client ID, click "Connect to Spotify"
2. Authorize the application when prompted by Spotify
3. You'll be redirected back to your controller
4. Your controller is now ready to use!

## Security Notes

- Your Spotify Client ID is stored locally in your browser's localStorage
- No sensitive information is stored in the GitHub repository
- The application uses the Spotify Implicit Grant flow (no server required)

## Troubleshooting

- If playback controls don't work, make sure Spotify is active on at least one of your devices
- If you get authentication errors, your session may have expired - click "Connect to Spotify" again
- If you need to use a different Spotify account, clear your browser's localStorage and refresh

## License

This project is available under the MIT License. Feel free to modify and use it as you wish!
