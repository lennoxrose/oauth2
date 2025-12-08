<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/env.php';

// Discord OAuth2 Configuration from environment
$discord_client_id = env('DISCORD_CLIENT_ID');
$discord_client_secret = env('DISCORD_CLIENT_SECRET');
$discord_redirect_uri = env('DISCORD_ADMIN_REDIRECT_URI');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $code = $data['code'] ?? null;
    
    if (!$code) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing authorization code']);
        exit;
    }
    
    try {
        // Exchange code for token
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
        
        if ($token_http_code != 200) {
            throw new Exception('Failed to exchange code for token (HTTP ' . $token_http_code . '): ' . $token_response);
        }
        
        $token_data = json_decode($token_response, true);
        
        if (!isset($token_data['access_token'])) {
            throw new Exception('No access token in response');
        }
        
        $access_token = $token_data['access_token'];
        
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
        
        // Check if user is in admin_permissions table
        require_once __DIR__ . '/db.php';
        
        try {
            $stmt = $pdo->prepare("SELECT discord_id FROM admin_permissions WHERE discord_id = ?");
            $stmt->execute([$user['id']]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admin) {
                // Not in admin_permissions table
                http_response_code(403);
                echo json_encode([
                    'error' => 'Unauthorized - You are not an admin',
                    'debug' => [
                        'user_id' => $user['id'],
                        'checked_table' => 'admin_permissions'
                    ]
                ]);
                exit;
            }
        } catch (PDOException $e) {
            // Database error - log and deny access
            error_log('Admin auth database error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Database error during authorization',
                'debug' => $e->getMessage()
            ]);
            exit;
        }
        
        // Return user data
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'avatar' => $user['avatar'],
                'access_token' => $access_token
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'OAuth callback failed: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
