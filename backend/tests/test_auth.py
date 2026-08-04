from app.core.security import get_password_hash, verify_password, create_access_token, decode_token


def test_password_hashing_and_verification() -> None:
    raw_password = "SecurePassword123!"
    hashed = get_password_hash(raw_password)
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation_and_decoding() -> None:
    subject = "user123"
    token = create_access_token(subject=subject, role="user")
    payload = decode_token(token)
    assert payload["sub"] == subject
    assert payload["role"] == "user"
    assert payload["type"] == "access"
