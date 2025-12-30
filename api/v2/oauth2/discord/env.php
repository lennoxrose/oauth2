<?php
/**
 * Environment Variable Loader
 * Loads configuration from .env.secret file
 */

function loadEnv($filePath = __DIR__ . '/.env.secret') {
    if (!file_exists($filePath)) {
        throw new Exception('.env.secret file not found');
    }
    
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $env[trim($key)] = trim($value);
        }
    }
    
    return $env;
}

// Load environment variables
try {
    $ENV = loadEnv();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration error: ' . $e->getMessage()]);
    exit;
}

// Helper function to get environment variable
function env($key, $default = null) {
    global $ENV;
    return $ENV[$key] ?? $default;
}
