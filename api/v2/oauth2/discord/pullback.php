<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/env.php';

// Verify API secret
$api_secret = env('API_SECRET');
$headers = getallheaders();
$auth_header = $headers['Authorization'] ?? '';
$provided_secret = str_replace('Bearer ', '', $auth_header);

if ($provided_secret !== $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

require_once __DIR__ . '/db.php';

// Get Discord Bot Configuration from database (bot_settings table)
try {
    $stmt = $pdo->query("SELECT setting_key, setting_value FROM bot_settings WHERE setting_key IN ('token', 'guild_id', 'verified_role_id', 'unverified_role_id')");
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    $discord_bot_token = $settings['token'] ?? null;
    $guild_id = $settings['guild_id'] ?? null;
    $verified_role_id = $settings['verified_role_id'] ?? null;
    $unverified_role_id = $settings['unverified_role_id'] ?? null;
    
    if (!$discord_bot_token || !$guild_id || !$verified_role_id) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Bot settings not configured. Please configure the bot token, guild ID, and verified role ID in Settings.',
            'missing' => [
                'token' => !$discord_bot_token,
                'guild_id' => !$guild_id,
                'verified_role_id' => !$verified_role_id
            ]
        ]);
        exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load bot settings from database: ' . $e->getMessage()]);
    exit;
}

// Helper function to call Discord API
function callDiscordAPI($endpoint, $method = 'GET', $data = null) {
    global $discord_bot_token;
    
    $options = [
        'http' => [
            'method' => $method,
            'header' => [
                'Authorization: Bot ' . $discord_bot_token,
                'Content-Type: application/json'
            ],
            'ignore_errors' => true
        ]
    ];
    
    if ($data !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
        $options['http']['content'] = json_encode($data);
    }
    
    $context = stream_context_create($options);
    $response = @file_get_contents('https://discord.com/api/v10' . $endpoint, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    // Get status code from response headers
    $status_line = $http_response_header[0] ?? '';
    preg_match('{HTTP\/\S*\s(\d{3})}', $status_line, $match);
    $status_code = isset($match[1]) ? (int)$match[1] : 0;
    
    return [
        'status' => $status_code,
        'data' => json_decode($response, true)
    ];
}

// GET - Get pullback status for all verified users
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Get all verified users from database
        $stmt = $pdo->query("SELECT user_id, username, email, verified_at FROM discord_verified_users ORDER BY verified_at DESC");
        $verified_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get all guild members from Discord
        $members_response = callDiscordAPI("/guilds/$guild_id/members?limit=1000");
        $guild_members = [];
        
        if ($members_response && $members_response['status'] === 200) {
            $guild_members = $members_response['data'];
        }
        
        // Create a map of user IDs in the guild
        $members_map = [];
        foreach ($guild_members as $member) {
            $members_map[$member['user']['id']] = $member;
        }
        
        // Categorize users
        $in_server = [];
        $left_server = [];
        
        foreach ($verified_users as $user) {
            $user_data = [
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'verified_at' => $user['verified_at']
            ];
            
            if (isset($members_map[$user['user_id']])) {
                // User is in server
                $member = $members_map[$user['user_id']];
                $has_role = in_array($verified_role_id, $member['roles']);
                
                $user_data['in_server'] = true;
                $user_data['has_verified_role'] = $has_role;
                $user_data['avatar'] = $member['user']['avatar'];
                $user_data['display_name'] = $member['nick'] ?? $member['user']['username'];
                
                $in_server[] = $user_data;
            } else {
                // User left server
                $user_data['in_server'] = false;
                $user_data['has_verified_role'] = false;
                $user_data['avatar'] = null;
                $user_data['display_name'] = $user['username'];
                
                $left_server[] = $user_data;
            }
        }
        
        echo json_encode([
            'success' => true,
            'total' => count($verified_users),
            'in_server' => $in_server,
            'left_server' => $left_server,
            'counts' => [
                'total' => count($verified_users),
                'in_server' => count($in_server),
                'left_server' => count($left_server)
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch pullback data: ' . $e->getMessage()]);
    }
    exit;
}

// POST - Pull back a user (add them back to server)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user_id = $input['user_id'] ?? null;
    $action = $input['action'] ?? 'invite'; // 'invite' or 'add_role'
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id']);
        exit;
    }
    
    try {
        // Get user's access token from database
        $stmt = $pdo->prepare("SELECT access_token, username FROM discord_verified_users WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found in database']);
            exit;
        }
        
        if ($action === 'add_role') {
            // User is already in server, add verified role and remove unverified role
            
            // 1. Add verified role
            $response = callDiscordAPI(
                "/guilds/$guild_id/members/$user_id/roles/$verified_role_id",
                'PUT'
            );
            
            if (!$response || $response['status'] !== 204) {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to add verified role',
                    'discord_error' => $response['data'] ?? 'Unknown error'
                ]);
                exit;
            }
            
            // 2. Remove unverified role if it exists
            if ($unverified_role_id) {
                $remove_response = callDiscordAPI(
                    "/guilds/$guild_id/members/$user_id/roles/$unverified_role_id",
                    'DELETE'
                );
                // Don't fail if removing unverified role fails (user might not have it)
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Added verified role to {$user['username']}",
                'action' => 'role_added'
            ]);
            
        } else {
            // User left server - add them back using OAuth2 token
            if (!$user['access_token']) {
                http_response_code(400);
                echo json_encode(['error' => 'User has no access token. They need to re-verify.']);
                exit;
            }
            
            // Add user with only verified role (not unverified)
            $response = callDiscordAPI(
                "/guilds/$guild_id/members/$user_id",
                'PUT',
                [
                    'access_token' => $user['access_token'],
                    'roles' => [$verified_role_id]
                ]
            );
            
            if ($response && ($response['status'] === 201 || $response['status'] === 204)) {
                // User was successfully added back
                // Now ensure they don't have the unverified role (in case the bot auto-assigned it)
                if ($unverified_role_id) {
                    // Wait a moment for Discord to process, then remove unverified role
                    sleep(1);
                    callDiscordAPI(
                        "/guilds/$guild_id/members/$user_id/roles/$unverified_role_id",
                        'DELETE'
                    );
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => "Successfully pulled back {$user['username']} to the server",
                    'action' => 'pulled_back'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Failed to pull back user',
                    'discord_error' => $response['data'] ?? 'Unknown error',
                    'note' => 'User may need to re-verify if their token expired'
                ]);
            }
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Pullback failed: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
