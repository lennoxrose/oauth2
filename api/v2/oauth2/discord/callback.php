<?php
// Catch all errors and convert to JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set up error handler to return JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Error: ' . $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
});

// Set up exception handler
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Exception: ' . $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    exit;
});

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';

// Create table if not exists
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS discord_verified_users (
            user_id VARCHAR(20) PRIMARY KEY,
            username VARCHAR(32) NOT NULL,
            discriminator VARCHAR(4),
            avatar VARCHAR(255),
            email VARCHAR(255),
            access_token TEXT,
            refresh_token TEXT,
            guilds JSON,
            verified_at BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_verified_at (verified_at),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database setup failed: ' . $e->getMessage()]);
    exit;
}

// Discord OAuth2 Configuration from environment
$discord_client_id = env('DISCORD_CLIENT_ID');
$discord_client_secret = env('DISCORD_CLIENT_SECRET');
$discord_redirect_uri = env('DISCORD_REDIRECT_URI');

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Log the request for debugging
error_log('Callback received - Method: ' . $_SERVER['REQUEST_METHOD'] . ' Path: ' . $_SERVER['REQUEST_URI']);

$data = json_decode(file_get_contents('php://input'), true);
$code = $data['code'] ?? null;

error_log('Callback data: ' . json_encode($data));

if (!$code) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing authorization code']);
    exit;
}

try {
    // Exchange code for access token
    $token_url = 'https://discord.com/api/v10/oauth2/token';
    $token_data = http_build_query([
        'client_id' => $discord_client_id,
        'client_secret' => $discord_client_secret,
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => $discord_redirect_uri
    ]);
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $token_data,
            'ignore_errors' => true
        ]
    ];
    
    $context = stream_context_create($options);
    $token_response = file_get_contents($token_url, false, $context);
    
    // Get HTTP response code
    $status_line = $http_response_header[0];
    preg_match('{HTTP\/\S*\s(\d{3})}', $status_line, $match);
    $token_http_code = $match[1];
    
    error_log('Token exchange - HTTP Code: ' . $token_http_code . ' Response: ' . $token_response);
    
    if ($token_http_code != 200) {
        throw new Exception('Failed to exchange code for token (HTTP ' . $token_http_code . '): ' . $token_response);
    }
    
    $token_data = json_decode($token_response, true);
    
    if (!isset($token_data['access_token'])) {
        throw new Exception('No access token in response: ' . $token_response);
    }
    
    $access_token = $token_data['access_token'];
    $refresh_token = $token_data['refresh_token'] ?? null;
    
    // Get user info
    $user_options = [
        'http' => [
            'method' => 'GET',
            'header' => 'Authorization: Bearer ' . $access_token
        ]
    ];
    
    $user_context = stream_context_create($user_options);
    $user_response = file_get_contents('https://discord.com/api/v10/users/@me', false, $user_context);
    $user = json_decode($user_response, true);
    
    // Get guilds
    $guilds_options = [
        'http' => [
            'method' => 'GET',
            'header' => 'Authorization: Bearer ' . $access_token
        ]
    ];
    
    $guilds_context = stream_context_create($guilds_options);
    $guilds_response = file_get_contents('https://discord.com/api/v10/users/@me/guilds', false, $guilds_context);
    $guilds = json_decode($guilds_response, true);
    
    error_log('User data - ID: ' . $user['id'] . ' Username: ' . $user['username']);
    error_log('Guilds count: ' . count($guilds));
    
    // Save to database
    $stmt = $pdo->prepare("
        INSERT INTO discord_verified_users 
        (user_id, username, discriminator, avatar, email, access_token, refresh_token, guilds, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            discriminator = VALUES(discriminator),
            avatar = VALUES(avatar),
            email = VALUES(email),
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            guilds = VALUES(guilds),
            verified_at = VALUES(verified_at)
    ");
    
    $execute_result = $stmt->execute([
        $user['id'],
        $user['username'],
        $user['discriminator'] ?? '0',
        $user['avatar'],
        $user['email'] ?? null,
        $access_token,
        $refresh_token,
        json_encode($guilds),
        round(microtime(true) * 1000)
    ]);
    
    error_log('Database insert result: ' . ($execute_result ? 'SUCCESS' : 'FAILED'));
    
    // Notify bot to give verified role (if user is in the server)
    // The bot will handle this via a periodic check or webhook
    // We'll store a flag that the user needs role assignment
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS pending_role_assignments (
                user_id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        $pdo->prepare("
            INSERT INTO pending_role_assignments (user_id) 
            VALUES (?) 
            ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
        ")->execute([$user['id']]);
        
        error_log('Added user ' . $user['id'] . ' to pending_role_assignments');
    } catch (Exception $e) {
        error_log('Failed to create pending role assignment: ' . $e->getMessage());
    }
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'discriminator' => $user['discriminator'] ?? '0',
            'avatar' => $user['avatar']
        ]
    ]);
    
} catch (Exception $e) {
    error_log('OAuth callback error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'OAuth callback failed: ' . $e->getMessage()]);
}
?>
