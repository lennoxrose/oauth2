<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';
require_once 'env.php';

// API Authentication - Require API secret for ALL methods
$env = loadEnv(__DIR__ . '/.env.secret');
$api_secret = $env['API_SECRET'] ?? '';
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!$auth_header || $auth_header !== 'Bearer ' . $api_secret) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized - Invalid API key']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET - Retrieve all settings or specific setting
if ($method === 'GET') {
    try {
        if (isset($_GET['key'])) {
            $stmt = $pdo->prepare("SELECT * FROM bot_settings WHERE setting_key = ?");
            $stmt->execute([$_GET['key']]);
            $setting = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($setting) {
                echo json_encode($setting);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Setting not found']);
            }
        } else {
            // Return all settings as key-value pairs
            $stmt = $pdo->query("SELECT setting_key, setting_value, setting_type, description FROM bot_settings");
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convert to object format
            $settingsObj = [];
            foreach ($settings as $setting) {
                $settingsObj[$setting['setting_key']] = [
                    'value' => $setting['setting_value'],
                    'type' => $setting['setting_type'],
                    'description' => $setting['description']
                ];
            }
            
            echo json_encode($settingsObj);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// POST/PUT - Update settings
if ($method === 'POST' || $method === 'PUT') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            exit;
        }
        
        $pdo->beginTransaction();
        
        foreach ($data as $key => $value) {
            $stmt = $pdo->prepare("
                UPDATE bot_settings 
                SET setting_value = ? 
                WHERE setting_key = ?
            ");
            $stmt->execute([$value, $key]);
        }
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Settings updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// DELETE - Reset a setting to empty
if ($method === 'DELETE') {
    try {
        if (!isset($_GET['key'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing setting key']);
            exit;
        }
        
        $stmt = $pdo->prepare("UPDATE bot_settings SET setting_value = '' WHERE setting_key = ?");
        $stmt->execute([$_GET['key']]);
        
        echo json_encode(['success' => true, 'message' => 'Setting reset']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
