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

// Get count before deletion
$count_stmt = $pdo->query("SELECT COUNT(*) as count FROM discord_verified_users");
$deleted_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['count'];

// Delete all users
$pdo->exec("DELETE FROM discord_verified_users");

echo json_encode([
    'success' => true,
    'message' => "Successfully deleted all verified users from database",
    'deleted_count' => $deleted_count,
    'remaining_count' => 0
]);
