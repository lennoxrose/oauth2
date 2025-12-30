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

// API Authentication
$api_secret = env('API_SECRET');
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!$auth_header || $auth_header !== 'Bearer ' . $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - Invalid API key']);
    exit;
}

// Parse the request path to get user ID if present
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = array_values(array_filter(explode('/', $path)));

// Check if this is a request for a specific user
// Path will be like: /v2/oath2/discord/users or /v2/oath2/discord/users/123456
$usersIndex = array_search('users', $pathParts);
$userId = isset($pathParts[$usersIndex + 1]) ? $pathParts[$usersIndex + 1] : null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($userId) {
        // Get specific user with full details including access_token
        try {
            $stmt = $pdo->prepare("SELECT * FROM discord_verified_users WHERE user_id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Parse guilds JSON
                $user['guilds'] = json_decode($user['guilds'], true);
                
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    } else {
        // List all verified users (without access tokens for security)
        try {
            $stmt = $pdo->query("SELECT user_id, username, discriminator, avatar, email, verified_at FROM discord_verified_users ORDER BY verified_at DESC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'count' => count($users),
                'users' => $users
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $userId) {
    // Delete user
    try {
        $stmt = $pdo->prepare("DELETE FROM discord_verified_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        
        echo json_encode([
            'success' => true,
            'deleted' => $stmt->rowCount() > 0
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Method not allowed
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
