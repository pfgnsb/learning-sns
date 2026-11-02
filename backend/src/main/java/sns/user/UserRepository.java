package sns.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final UserMapper users;

    public UserRepository(UserMapper users) {
        this.users = users;
    }

    public Optional<UserAccount> findById(UUID id) {
        return Optional.ofNullable(users.findById(id));
    }

    public Optional<UserAccount> findByUsernameIgnoreCase(String username) {
        return Optional.ofNullable(users.findByUsernameIgnoreCase(username));
    }

    public Optional<UserAccount> findByEmailIgnoreCase(String email) {
        return Optional.ofNullable(users.findByEmailIgnoreCase(email));
    }

    public void insert(UserAccount user) {
        users.insert(user);
    }
}
