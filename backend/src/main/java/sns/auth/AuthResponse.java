package sns.auth;

import sns.user.UserResponse;

public record AuthResponse(String token, UserResponse user) {
}
