<?php
// Run this file once to create the permissions table
require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';

try {
    // Create permissions table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            username VARCHAR(255) NOT NULL,
            discriminator VARCHAR(10) DEFAULT '0',
            avatar VARCHAR(255),
            can_view_dashboard BOOLEAN DEFAULT TRUE,
            can_view_users BOOLEAN DEFAULT FALSE,
            can_delete_users BOOLEAN DEFAULT FALSE,
            can_pullback BOOLEAN DEFAULT FALSE,
            can_sync BOOLEAN DEFAULT FALSE,
            can_manage_permissions BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    echo "✅ Permissions table created successfully!\n";
    
    // Add yourself as super admin (from environment)
    $adminUserId = env('ADMIN_USER_ID');
    $stmt = $pdo->prepare("
        INSERT INTO user_permissions 
        (user_id, username, discriminator, can_view_dashboard, can_view_users, can_delete_users, can_pullback, can_sync, can_manage_permissions)
        VALUES (?, 'l.e.nnox', '0', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
        ON DUPLICATE KEY UPDATE
        can_view_dashboard = TRUE,
        can_view_users = TRUE,
        can_delete_users = TRUE,
        can_pullback = TRUE,
        can_sync = TRUE,
        can_manage_permissions = TRUE
    ");
    $stmt->execute([$adminUserId]);
    
    echo "✅ Super admin permissions set!\n";
    
} catch (PDOException $e) {
    http_response_code(500);
    echo "❌ Database error: " . $e->getMessage();
}
