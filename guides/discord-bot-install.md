# Manual Installation Guide for OAuth2 Discord Bot

**Disclaimer:** The OAuth2 Discord bot has been developed and tested within a Docker container environment running on a Pterodactyl panel. While Docker-based deployments are fully supported and expected to function without issue, deployments outside of Docker are not guaranteed. Users deploying in non-Docker environments assume full responsibility for diagnosing and resolving any errors encountered. Issues identified in such environments should be reported via a pull request, accompanied by a detailed description of both the problem and the applied resolution.

---

## Introduction

This document provides a detailed and formalized guide for the manual installation and configuration of the OAuth2 Discord bot component. Proper operation of the bot presupposes that both the OAuth2 backend and administrative panel have already been installed and configured.

---

## Installation (Non-Pterodactyl Environment)

1. Download the `bot` directory to the target system.
2. Install Node.js and npm using a method appropriate to your operating system and distribution.
3. Ensure the runtime environment is capable of executing the bot independently.

---

## Installation (Pterodactyl Container Environment)

1. Select and deploy any compatible generic Node.js egg within your Pterodactyl panel.
2. Create a new server using the selected egg.
3. Upon completion of the automated installation process, upload the contents of the `bot` directory to the server.
4. Configure the server start command to execute the main entry file (e.g., `main.js`).

---

## Discord Application and Bot Setup

1. Navigate to the Discord Developer Portal:
   [https://discord.com/developers/applications/](https://discord.com/developers/applications/)

2. Create a new application and configure it as a Discord bot.

3. Within the OAuth2 section of the application settings, register the following redirect URIs (replace `example.com` with your actual domain):

   1. `https://example.com/oauth2/callback/`
   2. `https://example.com/admin/callback/`

4. (Optional but recommended) Create a dedicated Discord server, invite the bot, and grant it the highest permissions required for operation.

---

## Configuration

1. Rename the configuration template file:

```
config.example.xml → config.xml
```

2. Populate the configuration file with the required values, including:

* **API_SECRET**: The shared API secret used across the frontend, backend, and Discord bot. This value must be identical in all components.
* **WEB_URL**: The public-facing URL of your OAuth2 frontend where users will be redirected for verification (e.g., `https://example.com`). The bot automatically appends `/oauth2/` for verification links.
* **API_BASE_URL**: The base URL of your backend API server used for all API requests (e.g., `https://api.example.com/v2/oauth2/discord`). Must match the API endpoint configuration. 

Completion of this step assumes that the OAuth2 backend and administrative panel are already deployed, as the Discord bot is registered and managed through the admin interface.

---

## Note

We wish you Goodluck!
