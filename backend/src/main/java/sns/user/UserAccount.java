package sns.user;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserAccount(
        UUID id,
        String username,
        String displayName,
        String email,
        String passwordHash,
        OffsetDateTime createdAt
) {
}
