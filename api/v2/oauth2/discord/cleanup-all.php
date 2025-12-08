<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
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
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    require_once __DIR__ . '/db.php';
    
    // Get all users before deletion for details
    $stmt = $pdo->query("SELECT user_id, username, discriminator FROM discord_verified_users");
    $deleted_users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $deleted_count = count($deleted_users);
    
    // Delete all users
    $stmt = $pdo->prepare("DELETE FROM discord_verified_users");
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully removed all $deleted_count verified user(s)",
        'deleted_count' => $deleted_count,
        'remaining_count' => 0,
        'deleted_users' => $deleted_users
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
