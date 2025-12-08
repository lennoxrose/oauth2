<?php
// Public configuration endpoint for OAuth2 pages
// Returns only non-sensitive configuration values

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Read configuration from local .env file
$envPath = __DIR__ . '/.env';

if (!file_exists($envPath)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Configuration file not found',
        'message' => 'Please create .env file in /oauth2/ directory'
    ]);
    exit;
}

// Parse .env file
$envContent = file_get_contents($envPath);
$lines = explode("\n", $envContent);
$config = [];

foreach ($lines as $line) {
    $line = trim($line);
    
    // Skip comments and empty lines
    if (empty($line) || strpos($line, '#') === 0) {
        continue;
    }
    
    // Parse KEY=VALUE
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $config[trim($key)] = trim($value);
    }
}

// Validate required configuration
if (empty($config['API_BASE']) || empty($config['APP_DOMAIN'])) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Invalid configuration',
        'message' => 'API_BASE and APP_DOMAIN are required in .env file'
    ]);
    exit;
}

// Return only public configuration (no secrets)
echo json_encode([
    'api_base' => $config['API_BASE'],
    'app_domain' => $config['APP_DOMAIN']
]);
