<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
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

// GET - Get all pending role assignments
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Create table if not exists
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS pending_role_assignments (
                user_id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        $stmt = $pdo->query("SELECT user_id FROM pending_role_assignments ORDER BY created_at ASC LIMIT 100");
        $pending = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode([
            'success' => true,
            'pending' => $pending,
            'count' => count($pending)
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// DELETE - Remove user from pending (after role is assigned)
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['user_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing user_id']);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM pending_role_assignments WHERE user_id = ?");
        $stmt->execute([$data['user_id']]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Removed from pending list'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
