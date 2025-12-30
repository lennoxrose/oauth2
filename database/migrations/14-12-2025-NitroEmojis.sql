create table if not exists nitro_emojis (
    id int unsigned auto_increment primary key,
    name varchar(255) not null,
    hash varchar(255) not null,
    animated boolean default false,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
);

insert into nitro_emojis (name, hash, animated) values
('info', '1447332734413439118', false),
('warn', '1447333026874003676', false),
('member', '1447332985916620863', false),
('secure', '1447332693518979132', false),
('sparkle', '1404049227411361874', false),
('confirm', '1404062089718272003', false),
('good_connection', '1404063328455753789', false),
('mild_connection', '1404063326563995688', false),
('bad_connection', '1404063324634611822', false),
('network', '1404066633336754196', false),
('confirm', '1404062089718272003', false),
('cancel', '1404070746770112623', false),
('Other', '1404157223478886450', false),
('Support', '1404157229334003923', false),
('Billing', '1404157225622176015', false),
('neterror', '1404196736960041101', false),
('mod', '1404196738335637637', false),
('folder', '1404197045530787931', false);