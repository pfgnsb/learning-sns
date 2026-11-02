package sns.user;

import java.util.UUID;

public record UserResponse(UUID id, String username, String displayName, String email) {

    public static UserResponse from(UserAccount user) {
        return new UserResponse(user.id(), user.username(), user.displayName(), user.email());
    }
}
