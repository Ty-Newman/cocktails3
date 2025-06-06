-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create enum for user roles
create type user_role as enum ('user', 'admin'); 