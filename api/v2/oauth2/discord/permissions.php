<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

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

$method = $_SERVER['REQUEST_METHOD'];

// Helper function to get current user ID
function getCurrentUserId() {
    // For now, return admin ID from environment
    return env('ADMIN_USER_ID');
}

// Get current user's permissions
function getCurrentUserPermissions($pdo, $discordId) {
    $stmt = $pdo->prepare("SELECT discord_id, username, avatar, permissions FROM admin_permissions WHERE discord_id = ?");
    $stmt->execute([$discordId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && isset($user['permissions'])) {
        $user['permissions'] = json_decode($user['permissions'], true);
    }
    
    return $user;
}

// Check if user has a specific permission
function hasPermission($permissions, $permissionKey) {
    if (!$permissions || !is_array($permissions)) {
        return false;
    }
    
    return isset($permissions[$permissionKey]) && 
           isset($permissions[$permissionKey]['enabled']) && 
           $permissions[$permissionKey]['enabled'] === true;
}

// Get current user ID
$currentUserId = getCurrentUserId();

// GET - List all users with permissions
if ($method === 'GET') {
    // Check if current user can manage permissions
    $currentPerms = getCurrentUserPermissions($pdo, $currentUserId);
    if (!$currentPerms || !hasPermission($currentPerms['permissions'] ?? [], 'permissions')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You do not have permission to manage permissions']);
        exit;
    }
    
    // Check if requesting specific user by discord_id in URL path
    $requestUri = $_SERVER['REQUEST_URI'];
    $pathParts = explode('/', trim(parse_url($requestUri, PHP_URL_PATH), '/'));
    $discordId = null;
    
    // Check for /permissions/{discord_id} pattern
    if (count($pathParts) >= 2 && $pathParts[count($pathParts) - 2] === 'permissions') {
        $discordId = $pathParts[count($pathParts) - 1];
    }
    
    if ($discordId) {
        // Get specific user permissions
        $user = getCurrentUserPermissions($pdo, $discordId);
        
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
    } else {
        // Get all users with permissions
        $stmt = $pdo->query("SELECT discord_id, username, avatar, permissions, created_at, updated_at FROM admin_permissions ORDER BY created_at DESC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode JSON permissions for each user
        foreach ($users as &$user) {
            if (isset($user['permissions'])) {
                $user['permissions'] = json_decode($user['permissions'], true);
            }
        }
        
        echo json_encode(['success' => true, 'users' => $users]);
    }
}

// POST - Add new user with permissions
elseif ($method === 'POST') {
    $currentPerms = getCurrentUserPermissions($pdo, $currentUserId);
    if (!$currentPerms || !hasPermission($currentPerms['permissions'] ?? [], 'permissions')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You do not have permission to manage permissions']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['discord_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'discord_id is required']);
        exit;
    }
    
    // Get user info from verified users table
    $stmt = $pdo->prepare("SELECT * FROM discord_verified_users WHERE user_id = ?");
    $stmt->execute([$data['discord_id']]);
    $verifiedUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$verifiedUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User must be verified first']);
        exit;
    }
    
    // Default permissions structure (only dashboard enabled)
    $defaultPermissions = [
        'dashboard' => ['enabled' => true, 'subPermissions' => []],
        'users_view' => ['enabled' => false, 'subPermissions' => []],
        'users_delete' => ['enabled' => false, 'subPermissions' => []],
        'pullback' => ['enabled' => false, 'subPermissions' => []],
        'sync' => ['enabled' => false, 'subPermissions' => []],
        'settings_view' => [
            'enabled' => false,
            'subPermissions' => [
                'settings_view_token' => false,
                'settings_view_secret' => false
            ]
        ],
        'settings_edit' => ['enabled' => false, 'subPermissions' => []],
        'permissions' => ['enabled' => false, 'subPermissions' => []]
    ];
    
    // Use provided permissions or default
    $permissions = isset($data['permissions']) ? $data['permissions'] : $defaultPermissions;
    
    // Insert or update permissions
    $stmt = $pdo->prepare("
        INSERT INTO admin_permissions 
        (discord_id, username, avatar, permissions)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        permissions = VALUES(permissions),
        updated_at = CURRENT_TIMESTAMP
    ");
    
    $stmt->execute([
        $data['discord_id'],
        $verifiedUser['username'],
        $verifiedUser['avatar'],
        json_encode($permissions)
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Permissions added successfully']);
}

// PUT - Update user permissions
elseif ($method === 'PUT') {
    $currentPerms = getCurrentUserPermissions($pdo, $currentUserId);
    if (!$currentPerms || !hasPermission($currentPerms['permissions'] ?? [], 'permissions')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You do not have permission to manage permissions']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Extract discord_id from URL path
    $requestUri = $_SERVER['REQUEST_URI'];
    $pathParts = explode('/', trim(parse_url($requestUri, PHP_URL_PATH), '/'));
    $discordId = null;
    
    // Check for /permissions/{discord_id} pattern
    if (count($pathParts) >= 2 && $pathParts[count($pathParts) - 2] === 'permissions') {
        $discordId = $pathParts[count($pathParts) - 1];
    }
    
    // Fallback to body data if not in URL
    if (!$discordId && isset($data['discord_id'])) {
        $discordId = $data['discord_id'];
    }
    
    if (!$discordId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'discord_id is required']);
        exit;
    }
    
    if (!isset($data['permissions'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'permissions object is required']);
        exit;
    }
    
    $stmt = $pdo->prepare("
        UPDATE admin_permissions SET
        permissions = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE discord_id = ?
    ");
    
    $result = $stmt->execute([
        json_encode($data['permissions']),
        $discordId
    ]);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Permissions updated successfully']);
}

// DELETE - Remove user permissions
elseif ($method === 'DELETE') {
    $currentPerms = getCurrentUserPermissions($pdo, $currentUserId);
    if (!$currentPerms || !hasPermission($currentPerms['permissions'] ?? [], 'permissions')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You do not have permission to manage permissions']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Extract discord_id from URL path
    $requestUri = $_SERVER['REQUEST_URI'];
    $pathParts = explode('/', trim(parse_url($requestUri, PHP_URL_PATH), '/'));
    $discordId = null;
    
    // Check for /permissions/{discord_id} pattern
    if (count($pathParts) >= 2 && $pathParts[count($pathParts) - 2] === 'permissions') {
        $discordId = $pathParts[count($pathParts) - 1];
    }
    
    // Fallback to body data if not in URL
    if (!$discordId && isset($data['discord_id'])) {
        $discordId = $data['discord_id'];
    }
    
    if (!$discordId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'discord_id is required']);
        exit;
    }
    
    // Don't allow removing own permissions
    if ($discordId === $currentUserId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'You cannot remove your own permissions']);
        exit;
    }
    
    $stmt = $pdo->prepare("DELETE FROM admin_permissions WHERE discord_id = ?");
    $stmt->execute([$discordId]);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'message' => 'Permissions removed successfully']);
}

else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
