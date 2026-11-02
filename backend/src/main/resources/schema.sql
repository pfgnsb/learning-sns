CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    username varchar(15) NOT NULL,
    display_name varchar(50) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    bio varchar(160),
    icon_key text,
    created_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
