<?php
// Catch all errors and convert to JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'error' => 'PHP Error: ' . $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
});

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
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
