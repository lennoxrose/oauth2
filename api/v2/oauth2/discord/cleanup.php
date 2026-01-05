<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';

// API Authentication
$api_secret = env('API_SECRET');
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!$auth_header || $auth_header !== 'Bearer ' . $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - Invalid API key']);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Database connection
require_once __DIR__ . '/db.php';

// Fetch all users
$stmt = $pdo->query("SELECT user_id, username, discriminator, access_token FROM discord_verified_users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

$deleted_users = [];
$deleted_count = 0;

// Check each user's token
foreach ($users as $user) {
    $token = $user['access_token'];
    
    // Try to verify the token by calling Discord API
    $url = 'https://discord.com/api/v10/users/@me';
    
    $options = [
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer $token\r\n",
            'ignore_errors' => true
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    
    // Check if token is invalid (ONLY 401 response, not network failures)
    $is_unauthorized = false;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (strpos($header, 'HTTP/') === 0 && strpos($header, '401') !== false) {
                $is_unauthorized = true;
                break;
            }
        }
    }
    
    if ($is_unauthorized) {
        // Delete this user
        $delete_stmt = $pdo->prepare("DELETE FROM discord_verified_users WHERE user_id = ?");
        $delete_stmt->execute([$user['user_id']]);
        
        $deleted_users[] = [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'discriminator' => $user['discriminator']
        ];
        
        $deleted_count++;
    }
}

// Get remaining count
$remaining_stmt = $pdo->query("SELECT COUNT(*) as count FROM discord_verified_users");
$remaining_count = $remaining_stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo json_encode([
    'success' => true,
    'message' => "Removed $deleted_count user(s) with invalid tokens",
    'deleted_count' => $deleted_count,
    'remaining_count' => $remaining_count,
    'deleted_users' => $deleted_users
]);
