<?php
// Secure endpoint to provide configuration to authenticated admin dashboard
// Only accessible to admin users

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Read configuration from .env file
$envPath = __DIR__ . '/.env';

if (!file_exists($envPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
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

// Validate required fields
$required = ['API_SECRET', 'API_BASE', 'ADMIN_USER_ID', 'APP_DOMAIN'];
foreach ($required as $field) {
    if (!isset($config[$field]) || empty($config[$field])) {
        http_response_code(500);
        echo json_encode(['error' => "Missing required configuration: $field"]);
        exit;
    }
}

// Return configuration for admin dashboard use
echo json_encode([
    'api_secret' => $config['API_SECRET'],
    'api_base' => $config['API_BASE'],
    'admin_user_id' => $config['ADMIN_USER_ID'],
    'app_domain' => $config['APP_DOMAIN']
]);
