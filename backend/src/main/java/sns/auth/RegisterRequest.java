package sns.auth;

public record RegisterRequest(String displayName, String username, String email, String password) {
}
