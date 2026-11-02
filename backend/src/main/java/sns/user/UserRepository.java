package sns.user;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final String SELECT_COLUMNS = """
            SELECT id, username, display_name, email, password_hash, created_at
            FROM users
            """;

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserAccount> findById(UUID id) {
        return jdbc.sql(SELECT_COLUMNS + " WHERE id = :id")
                .param("id", id)
                .query(UserRepository::map)
                .optional();
    }

    public Optional<UserAccount> findByUsernameIgnoreCase(String username) {
        return jdbc.sql(SELECT_COLUMNS + " WHERE lower(username) = lower(:username)")
                .param("username", username)
                .query(UserRepository::map)
                .optional();
    }

    public Optional<UserAccount> findByEmailIgnoreCase(String email) {
        return jdbc.sql(SELECT_COLUMNS + " WHERE lower(email) = lower(:email)")
                .param("email", email)
                .query(UserRepository::map)
                .optional();
    }

    public void insert(UserAccount user) {
        jdbc.sql("""
                INSERT INTO users (
                    id, username, display_name, email, password_hash, bio, icon_key, created_at
                ) VALUES (
                    :id, :username, :displayName, :email, :passwordHash, NULL, NULL, :createdAt
                )
                """)
                .param("id", user.id())
                .param("username", user.username())
                .param("displayName", user.displayName())
                .param("email", user.email())
                .param("passwordHash", user.passwordHash())
                .param("createdAt", user.createdAt())
                .update();
    }

    private static UserAccount map(java.sql.ResultSet resultSet, int rowNumber) throws java.sql.SQLException {
        return new UserAccount(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("username"),
                resultSet.getString("display_name"),
                resultSet.getString("email"),
                resultSet.getString("password_hash"),
                resultSet.getObject("created_at", OffsetDateTime.class)
        );
    }
}
