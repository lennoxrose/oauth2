<?php
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

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = array_values(array_filter(explode('/', $path)));

// Discord OAuth2 Configuration from environment
$discord_client_id = env('DISCORD_CLIENT_ID');
$discord_client_secret = env('DISCORD_CLIENT_SECRET');
$discord_redirect_uri = env('DISCORD_REDIRECT_URI');

// Route: GET /v2/oath2/discord/auth - Redirect to Discord OAuth
if ($method === 'GET' && in_array('auth', $pathParts)) {
    $params = http_build_query([
        'client_id' => $discord_client_id,
        'redirect_uri' => $discord_redirect_uri,
        'response_type' => 'code',
        'scope' => 'identify email guilds guilds.join'
    ]);
    
    header('Location: https://discord.com/oauth2/authorize?' . $params);
    exit;
}

// Route: POST /v2/oath2/discord/callback - Handle OAuth callback
if ($method === 'POST' && in_array('callback', $pathParts)) {
    // Log the request for debugging
    error_log('Callback received - Method: ' . $method . ' Path: ' . $_SERVER['REQUEST_URI']);
    
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
        $token_data = [
            'client_id' => $discord_client_id,
            'client_secret' => $discord_client_secret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $discord_redirect_uri
        ];
        
        $ch = curl_init($token_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($token_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        
        $token_response = curl_exec($ch);
        $token_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        error_log('Token exchange - HTTP Code: ' . $token_http_code . ' Response: ' . $token_response);
        
        if ($curl_error) {
            throw new Exception('CURL Error: ' . $curl_error);
        }
        
        if ($token_http_code !== 200) {
            throw new Exception('Failed to exchange code for token (HTTP ' . $token_http_code . '): ' . $token_response);
        }
        
        $token_data = json_decode($token_response, true);
        
        if (!isset($token_data['access_token'])) {
            throw new Exception('No access token in response: ' . $token_response);
        }
        
        $access_token = $token_data['access_token'];
        $refresh_token = $token_data['refresh_token'] ?? null;
        
        // Get user info
        $user_ch = curl_init('https://discord.com/api/v10/users/@me');
        curl_setopt($user_ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($user_ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token
        ]);
        $user_response = curl_exec($user_ch);
        curl_close($user_ch);
        
        $user = json_decode($user_response, true);
        
        // Get guilds
        $guilds_ch = curl_init('https://discord.com/api/v10/users/@me/guilds');
        curl_setopt($guilds_ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($guilds_ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token
        ]);
        $guilds_response = curl_exec($guilds_ch);
        curl_close($guilds_ch);
        
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
        http_response_code(500);
        echo json_encode(['error' => 'OAuth callback failed: ' . $e->getMessage()]);
    }
    exit;
}

// Route: GET /v2/oath2/discord/users - List all verified users
if ($method === 'GET' && in_array('users', $pathParts) && !isset($pathParts[array_search('users', $pathParts) + 1])) {
    try {
        $stmt = $pdo->query("SELECT user_id, username, discriminator, email, verified_at FROM discord_verified_users ORDER BY verified_at DESC");
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
    exit;
}

// Route: GET /v2/oath2/discord/users/{id} - Get specific user
if ($method === 'GET' && in_array('users', $pathParts)) {
    $userIndex = array_search('users', $pathParts);
    $userId = $pathParts[$userIndex + 1] ?? null;
    
    if ($userId) {
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
        exit;
    }
}

// Route: DELETE /v2/oath2/discord/users/{id} - Delete user
if ($method === 'DELETE' && in_array('users', $pathParts)) {
    $userIndex = array_search('users', $pathParts);
    $userId = $pathParts[$userIndex + 1] ?? null;
    
    if ($userId) {
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
}

// Route: GET /v2/oath2/discord/stats - Get statistics
if ($method === 'GET' && in_array('stats', $pathParts)) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM discord_verified_users");
        $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        $today_start = strtotime('today') * 1000;
        $stmt = $pdo->prepare("SELECT COUNT(*) as today FROM discord_verified_users WHERE verified_at > ?");
        $stmt->execute([$today_start]);
        $today = $stmt->fetch(PDO::FETCH_ASSOC)['today'];
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_users' => (int)$total,
                'verified_today' => (int)$today,
                'database' => 'MariaDB'
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// Default 404
http_response_code(404);
echo json_encode([
    'error' => 'Endpoint not found',
    'available_endpoints' => [
        'GET /v2/oath2/discord/auth' => 'Redirect to Discord OAuth',
        'POST /v2/oath2/discord/callback' => 'Handle OAuth callback',
        'GET /v2/oath2/discord/users' => 'List all verified users',
        'GET /v2/oath2/discord/users/{id}' => 'Get specific user',
        'DELETE /v2/oath2/discord/users/{id}' => 'Delete user',
        'GET /v2/oath2/discord/stats' => 'Get statistics'
    ]
]);
?>
