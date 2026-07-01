-- SQL Schema for Tabungan-Qurban Database Setup in Supabase
-- Paste this script into your Supabase SQL Editor and run it.

-- Enable Row Level Security (RLS) or bypass if doing simple setup.
-- For a quick demo/setup, we will create the tables. You can customize security rules.

-- 1. settings table
CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL
);

-- Seed default settings if not exists
INSERT INTO settings (key, value) VALUES (
    'config', 
    '{"adminPin": "1234", "targetDefault": 3000000, "namaProgram": "Tabungan Qurban", "adminWhatsapp": "", "animalTypes": [{"id": "kambing", "name": "Kambing", "price": 3000000, "quota": 1}, {"id": "domba", "name": "Domba", "price": 2800000, "quota": 1}, {"id": "sapi", "name": "Sapi (1/7 bagian)", "price": 2500000, "quota": 7}, {"id": "kerbau", "name": "Kerbau (1/7 bagian)", "price": 2500000, "quota": 7}]}'
) ON CONFLICT (key) DO NOTHING;

-- 2. members table
CREATE TABLE IF NOT EXISTS members (
    id text PRIMARY KEY,
    name text NOT NULL,
    phone text UNIQUE NOT NULL,
    pin text NOT NULL,
    animal_id text,
    target integer,
    join_date text NOT NULL
);

-- 3. transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id text PRIMARY KEY,
    member_id text REFERENCES members(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    date text NOT NULL,
    type text NOT NULL, -- 'setor' or 'tarik'
    note text,
    created_at bigint NOT NULL
);

-- 4. confirmations table
CREATE TABLE IF NOT EXISTS confirmations (
    id text PRIMARY KEY,
    member_id text REFERENCES members(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    date text NOT NULL,
    note text,
    proof_image text, -- base64 representation of image
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at bigint NOT NULL
);

-- 5. group_overrides table
CREATE TABLE IF NOT EXISTS group_overrides (
    animal_id text PRIMARY KEY,
    groups jsonb NOT NULL,
    names jsonb NOT NULL
);
