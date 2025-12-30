create table if not exists embeds (
    id int unsigned auto_increment primary key,
    name varchar(255) not null,
    description text,
    color varchar(7) default '#000000',
    footer_text varchar(255),
    footer_icon_url varchar(255),
    timestamp boolean default false,
    author_name varchar(255),
    author_icon_url varchar(255),
    author_url varchar(255),
    title varchar(255),
    title_url varchar(255),
    image_url varchar(255),
    thumbnail_url varchar(255),
    fields json,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

-- Verification embed
insert into embeds (name, title, description, color, footer_text, timestamp, fields) values
(
    'verification',
    '<:secure:1447332693518979132> Account Verification',
    'Click the button below to verify your Discord account and get access!',
    '#1e1e1e',
    'Your data is stored securely and only used for verification purposes',
    true,
    '[
        {
            "name": "<:sparkle:1404049227411361874> Why Verify?",
            "value": "• Gain access to exclusive channels\\n• Stay connected with the community\\n• Easy re-invite if you leave",
            "inline": false
        },
        {
            "name": "<:secure:1447332693518979132> What We Store",
            "value": "• Your Discord username and ID\\n• Email address\\n• Server memberships",
            "inline": false
        },
        {
            "name": "<:info:1447332734413439118> How It Works",
            "value": "1. Click the button below\\n2. Login with Discord OAuth2\\n3. Authorize the application\\n4. You are verified!",
            "inline": false
        }
    ]'
);

-- Auth link embed
insert into embeds (name, title, description, color, footer_text, timestamp, fields) values
(
    'auth_link',
    '<:secure:1447332693518979132> Discord Verification',
    'Click the link below to verify your Discord account:',
    '#1e1e1e',
    'Your data is stored securely',
    true,
    '[
        {
            "name": "<:network:1404066633336754196> Verification Link",
            "value": "[Click here to verify](PLACEHOLDER_URL)",
            "inline": false
        },
        {
            "name": "<:info:1447332734413439118> What happens?",
            "value": "• You will login with Discord\\n• We will save your user info\\n• You can be pulled back to servers",
            "inline": false
        }
    ]'
);

-- Verified users list embed
insert into embeds (name, title, description, color) values
(
    'verified_users_list',
    '<:folder:1404197045530787931> Verified Users',
    'Total: {count} users',
    '#1e1e1e'
);

-- Pullback results embed
insert into embeds (name, title, color, footer_text, fields) values
(
    'pullback_results',
    '<:folder:1404197045530787931> Pullback Results',
    '#1e1e1e',
    'Note: Failed users may have expired tokens or left Discord',
    '[
        {
            "name": "<:confirm:1404062089718272003> Successfully Added",
            "value": "{success}",
            "inline": true
        },
        {
            "name": "<:cancel:1404070746770112623> Failed",
            "value": "{failed}",
            "inline": true
        },
        {
            "name": "<:member:1447332985916620863> Already in Server",
            "value": "{already_in}",
            "inline": true
        }
    ]'
);

-- Error embed template
insert into embeds (name, title, description, color, timestamp) values
(
    'error',
    '<:cancel:1404070746770112623> Error',
    'An error occurred. Please try again.',
    '#1e1e1e',
    true
);

-- Success embed template
insert into embeds (name, title, description, color, timestamp) values
(
    'success',
    '<:confirm:1404062089718272003> Success',
    'Operation completed successfully!',
    '#1e1e1e',
    true
);

-- Info embed template
insert into embeds (name, title, description, color, timestamp) values
(
    'info',
    '<:info:1447332734413439118> Information',
    'Here is some information.',
    '#1e1e1e',
    true
);

-- Warning embed template
insert into embeds (name, title, description, color, timestamp) values
(
    'warning',
    '<:warn:1447333026874003676> Warning',
    'Please pay attention to this warning.',
    '#1e1e1e',
    true
);

 