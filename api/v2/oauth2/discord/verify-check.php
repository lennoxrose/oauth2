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
require_once 'db.php';

// API Authentication
$api_secret = env('API_SECRET');
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!$auth_header || $auth_header !== 'Bearer ' . $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - Invalid API key']);
    exit;
}

// POST - Give verified role to user
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['user_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing user_id']);
            exit;
        }
        
        $userId = $data['user_id'];
        
        // Check if user is verified
        $stmt = $pdo->prepare("SELECT user_id FROM discord_verified_users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $verified = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($verified) {
            echo json_encode([
                'success' => true,
                'verified' => true,
                'message' => 'User is verified'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'verified' => false,
                'message' => 'User is not verified'
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
