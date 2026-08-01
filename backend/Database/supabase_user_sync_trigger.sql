-- =============================================
-- Supabase Auth User Sync Trigger
-- Đồng bộ user từ auth.users sang AspNetUsers
-- =============================================

-- 1. Tạo function để handle INSERT (khi user đăng ký mới)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_avatar TEXT;
BEGIN
    -- Lấy metadata từ user_metadata
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_phone := NEW.raw_user_meta_data->>'phone';
    v_avatar := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Insert vào AspNetUsers
    INSERT INTO public."AspNetUsers" (
        "Id",
        "UserName",
        "NormalizedUserName",
        "Email",
        "NormalizedEmail",
        "EmailConfirmed",
        "PasswordHash",
        "SecurityStamp",
        "ConcurrencyStamp",
        "PhoneNumber",
        "PhoneNumberConfirmed",
        "TwoFactorEnabled",
        "LockoutEnd",
        "LockoutEnabled",
        "AccessFailedCount",
        "FullName",
        "Address",
        "DateOfBirth",
        "Avatar",
        "Occupation",
        "RoleId",
        "token",
        "CreatedAt",
        "LastLoginAt",
        "UpdatedAt",
        "IsDeleted"
    )
    VALUES (
        NEW.id::TEXT,                                    -- Id (Supabase user id)
        NEW.email,                                       -- UserName (sử dụng email để đảm bảo duy nhất, không dùng full_name)
        UPPER(NEW.email),                                -- NormalizedUserName
        NEW.email,                                       -- Email
        UPPER(NEW.email),                                -- NormalizedEmail
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE), -- EmailConfirmed
        '',                                              -- PasswordHash (Supabase quản lý)
        gen_random_uuid()::TEXT,                         -- SecurityStamp
        gen_random_uuid()::TEXT,                         -- ConcurrencyStamp
        COALESCE(NEW.phone, v_phone),                    -- PhoneNumber
        COALESCE(NEW.phone_confirmed_at IS NOT NULL, FALSE), -- PhoneNumberConfirmed
        FALSE,                                           -- TwoFactorEnabled
        NULL,                                            -- LockoutEnd
        FALSE,                                           -- LockoutEnabled
        0,                                               -- AccessFailedCount
        v_full_name,                                     -- FullName
        '',                                              -- Address (default empty)
        NULL,                                            -- DateOfBirth
        COALESCE(v_avatar, ''),                          -- Avatar (default empty - NOT NULL)
        '',                                              -- Occupation (default empty - NOT NULL)
        NULL,                                            -- RoleId
        '',                                              -- token (default empty - NOT NULL)
        NOW(),                                           -- CreatedAt
        NEW.last_sign_in_at,                             -- LastLoginAt
        NULL,                                            -- UpdatedAt
        FALSE                                            -- IsDeleted
    )
    ON CONFLICT ("Id") DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- 2. Tạo function để handle UPDATE (khi user cập nhật thông tin)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_avatar TEXT;
BEGIN
    -- Lấy metadata từ user_metadata
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_phone := NEW.raw_user_meta_data->>'phone';
    v_avatar := NEW.raw_user_meta_data->>'avatar_url';
    
    -- Update AspNetUsers
    UPDATE public."AspNetUsers"
    SET
        "Email" = NEW.email,
        "NormalizedEmail" = UPPER(NEW.email),
        "EmailConfirmed" = COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
        "PhoneNumber" = COALESCE(NEW.phone, v_phone, "PhoneNumber"),
        "PhoneNumberConfirmed" = COALESCE(NEW.phone_confirmed_at IS NOT NULL, FALSE),
        "FullName" = COALESCE(v_full_name, "FullName"),
        "Avatar" = COALESCE(v_avatar, "Avatar"),
        "LastLoginAt" = NEW.last_sign_in_at,
        "UpdatedAt" = NOW()
    WHERE "Id" = NEW.id::TEXT;
    
    RETURN NEW;
END;
$$;

-- 3. Tạo function để handle DELETE (khi user bị xóa - soft delete)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Soft delete trong AspNetUsers
    UPDATE public."AspNetUsers"
    SET
        "IsDeleted" = TRUE,
        "UpdatedAt" = NOW()
    WHERE "Id" = OLD.id::TEXT;
    
    RETURN OLD;
END;
$$;

-- =============================================
-- TẠO TRIGGERS
-- =============================================

-- Drop existing triggers nếu có
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Trigger khi user mới được tạo
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger khi user được cập nhật
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();

-- Trigger khi user bị xóa
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_delete();

-- =============================================
-- KIỂM TRA TRIGGERS ĐÃ ĐƯỢC TẠO
-- =============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';
