# LMS Backend Sequence Diagrams

This document describes the main authentication flows implemented in the LMS backend.

## Login Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL
    participant JWT as JwtService
    participant TS as TokenService

    User->>FE: Enter email and password
    FE->>AC: POST /auth/login
    AC->>AS: login(loginDto)

    AS->>US: findByEmail(email)
    US->>DB: Find user by email
    DB-->>US: User
    US-->>AS: User

    AS->>AS: Verify password with Argon2
    AS->>AS: Check email is verified

    AS->>JWT: Generate access token
    JWT-->>AS: Access token

    AS->>TS: Generate refresh token
    TS-->>AS: Refresh token

    AS->>DB: Store hashed refresh token
    DB-->>AS: Refresh token saved

    AS-->>AC: Access token + Refresh token + User
    AC-->>FE: 200 OK
    FE-->>User: Login successful
```

## Registration and Email Verification Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL
    participant TS as TokenService
    participant MS as MailService

    User->>FE: Enter registration information
    FE->>AC: POST /auth/register
    AC->>AS: register(registerDto)

    AS->>US: findByEmail(email)
    US->>DB: Find user by email
    DB-->>US: User or null
    US-->>AS: User or null

    alt Email already registered
        AS-->>AC: ConflictException
        AC-->>FE: 409 Conflict
        FE-->>User: Email is already registered
    else Email is available
        AS->>AS: Hash password with Argon2

        AS->>US: create(userData)
        US->>DB: Insert new user
        DB-->>US: Created user
        US-->>AS: Created user

        AS->>TS: Generate verification OTP
        TS-->>AS: OTP

        AS->>TS: Hash OTP
        TS-->>AS: OTP hash

        AS->>DB: Store EMAIL_VERIFICATION token hash
        DB-->>AS: Token saved

        AS->>MS: sendVerificationOtp(email, OTP)
        MS-->>AS: OTP sent

        AS-->>AC: Registered user
        AC-->>FE: Registration successful
        FE-->>User: Enter verification code
    end

    User->>FE: Enter OTP
    FE->>AC: POST /auth/verify-email
    AC->>AS: verifyEmail(verifyEmailDto)

    AS->>US: findByEmail(email)
    US->>DB: Find user
    DB-->>US: User
    US-->>AS: User

    AS->>DB: Find latest EMAIL_VERIFICATION token
    DB-->>AS: Verification token

    AS->>AS: Check token expiration
    AS->>TS: Verify OTP against token hash
    TS-->>AS: OTP valid

    AS->>US: markAsVerified(user)
    US->>DB: Set isVerified = true
    DB-->>US: Updated

    AS->>DB: Delete verification tokens
    DB-->>AS: Deleted

    AS-->>AC: Email verified successfully
    AC-->>FE: Success response
    FE-->>User: Email verified
```

## Refresh Token Rotation Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthService
    participant DB as PostgreSQL
    participant JWT as JwtService
    participant TS as TokenService

    User->>FE: Continue using the application
    FE->>AC: POST /auth/refresh + Refresh Token
    AC->>AS: refresh(refreshToken)

    AS->>DB: Find stored refresh token
    DB-->>AS: Stored token hash

    AS->>TS: Verify refresh token against stored hash
    TS-->>AS: Token valid

    alt Refresh token is invalid or expired
        AS-->>AC: UnauthorizedException
        AC-->>FE: 401 Unauthorized
        FE-->>User: Authentication required
    else Refresh token is valid
        AS->>DB: Delete old refresh token
        DB-->>AS: Old token revoked

        AS->>JWT: Generate new access token
        JWT-->>AS: New access token

        AS->>TS: Generate new refresh token
        TS-->>AS: New refresh token

        AS->>TS: Hash new refresh token
        TS-->>AS: Refresh token hash

        AS->>DB: Store hashed new refresh token
        DB-->>AS: New token saved

        AS-->>AC: New access token + refresh token
        AC-->>FE: 200 OK + New tokens
        FE-->>User: Session continues
    end
```

## Protected Route - JWT Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Guard as JwtAuthGuard
    participant JWT as JwtService
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL

    User->>FE: Request profile
    FE->>Guard: GET /auth/me + Bearer Access Token

    Guard->>JWT: Verify access token

    alt Token is invalid or expired
        JWT-->>Guard: Verification failed
        Guard-->>FE: 401 Unauthorized
        FE-->>User: Authentication required
    else Token is valid
        JWT-->>Guard: Decoded JWT payload
        Guard->>Guard: Attach user payload to request

        Guard->>AC: Allow request
        AC->>AS: getProfile(userId)

        AS->>US: findById(userId)
        US->>DB: Find user by ID
        DB-->>US: User
        US-->>AS: User

        alt User no longer exists
            AS-->>AC: UnauthorizedException
            AC-->>FE: 401 Unauthorized
            FE-->>User: Authentication required
        else User exists
            AS-->>AC: User profile
            AC-->>FE: 200 OK + User profile
            FE-->>User: Display profile
        end
    end
```

## Forgot and Reset Password Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL
    participant TS as TokenService
    participant MS as MailService

    User->>FE: Request password reset
    FE->>AC: POST /auth/forgot-password
    AC->>AS: forgotPassword(forgotPasswordDto)

    AS->>US: findByEmail(email)
    US->>DB: Find user by email
    DB-->>US: User or null
    US-->>AS: User or null

    alt User exists
        AS->>DB: Delete old PASSWORD_RESET tokens
        DB-->>AS: Old tokens deleted

        AS->>TS: Generate reset OTP
        TS-->>AS: OTP

        AS->>TS: Hash OTP
        TS-->>AS: OTP hash

        AS->>DB: Store PASSWORD_RESET token hash
        DB-->>AS: Token saved

        AS->>MS: sendPasswordResetOtp(email, OTP)
        MS-->>AS: OTP sent
    end

    AS-->>AC: Generic response
    AC-->>FE: 200 OK
    FE-->>User: If account exists, reset code was sent

    User->>FE: Enter OTP and new password
    FE->>AC: POST /auth/reset-password
    AC->>AS: resetPassword(resetPasswordDto)

    AS->>US: findByEmail(email)
    US->>DB: Find user
    DB-->>US: User
    US-->>AS: User

    AS->>DB: Find latest PASSWORD_RESET token
    DB-->>AS: Reset token

    AS->>AS: Check token expiration
    AS->>TS: Verify OTP against token hash
    TS-->>AS: OTP valid

    AS->>AS: Hash new password with Argon2
    AS->>US: Update password
    US->>DB: Save new password hash
    DB-->>US: Updated

    AS->>DB: Delete PASSWORD_RESET tokens
    DB-->>AS: Tokens deleted

    AS->>DB: Revoke user's refresh tokens
    DB-->>AS: Sessions revoked

    AS-->>AC: Password reset successfully
    AC-->>FE: 200 OK
    FE-->>User: Password changed
```

## Change Password Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant Guard as JwtAuthGuard
    participant AC as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL

    User->>FE: Enter current password and new password
    FE->>Guard: POST /auth/change-password + Bearer Access Token

    Guard->>Guard: Verify access token

    alt Access token is invalid or expired
        Guard-->>FE: 401 Unauthorized
        FE-->>User: Authentication required
    else Access token is valid
        Guard->>AC: Allow authenticated request
        AC->>AS: changePassword(userId, changePasswordDto)

        AS->>US: findById(userId)
        US->>DB: Find user by ID
        DB-->>US: User
        US-->>AS: User

        AS->>AS: Verify current password with Argon2

        alt Current password is incorrect
            AS-->>AC: UnauthorizedException
            AC-->>FE: 401 Unauthorized
            FE-->>User: Current password is incorrect
        else Current password is correct
            AS->>AS: Hash new password with Argon2

            AS->>US: Update password
            US->>DB: Save new password hash
            DB-->>US: Updated

            AS->>DB: Revoke user's refresh tokens
            DB-->>AS: Sessions revoked

            AS-->>AC: Password changed successfully
            AC-->>FE: 200 OK
            FE-->>User: Password changed
        end
    end
```

## Logout Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant AC as AuthController
    participant AS as AuthService
    participant DB as PostgreSQL
    participant TS as TokenService

    User->>FE: Click Logout
    FE->>AC: POST /auth/logout + Refresh Token
    AC->>AS: logout(refreshToken)

    AS->>TS: Hash refresh token
    TS-->>AS: Refresh token hash

    AS->>DB: Find and delete matching refresh token
    DB-->>AS: Refresh token revoked

    AS-->>AC: Logout successful
    AC-->>FE: 200 OK

    FE->>FE: Clear authentication state
    FE-->>User: Redirect to login
```